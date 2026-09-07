# TerraSpace — Docker (PostgreSQL only)

**Scope:** Local development only. Docker runs **the database and nothing else** — the API runs natively on the host with `node --watch`.

> **Development only.** Nothing here describes a production deployment. Credentials are throwaway, the data volume is disposable, and there is no backup story — this file exists so every developer gets the same PostgreSQL with the same extensions, and nothing more.

**Companion:** [`be-architecture.md`](./be-architecture.md) · [`testing.md`](./testing.md) · [`erd-spec.md`](./erd-spec.md)

---

## 1. What runs where

| | Where | Command |
|---|---|---|
| **PostgreSQL** | Docker | `docker compose up -d` |
| **API** | Host | `node --watch src/server.js` |
| **Migrations** | Host | `npx prisma migrate dev` |
| **Tests** | Own throwaway container | Testcontainers ([`testing.md`](./testing.md) §6) |
| **PayBridge** | External service | Not containerized ([`features/payments.md`](./features/payments.md)) |

### Why this split works well here

The backend is plain JavaScript with **no build step** ([`libraries.md`](./libraries.md) §1), so there is nothing a container would add to development:

| On the host you get | In a container you would fight |
|---|---|
| `node --watch` restarts instantly | Bind-mount file-watching, often needing polling |
| Native debugger attach, straight from the editor | Port forwarding and source maps |
| `npm i` just works | `node_modules` shadowing between host and container ([§8](#8-common-failures)) |
| Prisma engine matches your OS | Alpine musl binary targets |

PostgreSQL is the opposite case — version-pinned, needs extensions, and you never want it installed system-wide. That is exactly what a container is for.

---

## 2. `compose.yaml`

```yaml
name: terraspace

services:
  postgres:
    image: postgres:16-alpine
    container_name: terraspace-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: terraspace
      POSTGRES_PASSWORD: terraspace
      POSTGRES_DB: terraspace
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U terraspace -d terraspace"]
      interval: 5s
      timeout: 5s
      retries: 10
      start_period: 10s

volumes:
  pgdata:
```

**Pin the major version.** `postgres:16-alpine`, never `postgres:latest` — a silent major bump makes the existing data directory unreadable and the container crash-loops on start.

### If port 5432 is already taken

A locally installed PostgreSQL will hold it. Remap the host side only:

```yaml
    ports:
      - "5433:5432"
```

Then `DATABASE_URL=postgresql://terraspace:terraspace@localhost:5433/terraspace`. The container's own port stays 5432.

---

## 3. Extensions — not optional

The V2 ERD's no-double-booking guarantee needs `btree_gist` ([`erd-spec.md`](./erd-spec.md) §13). The migration creates it, but seeding it here means a fresh volume is correct before anything else runs:

```sql
-- docker/postgres/init/01-extensions.sql
CREATE EXTENSION IF NOT EXISTS btree_gist;   -- exclusion constraint on bookings
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- gen_random_uuid()
```

> Scripts in `/docker-entrypoint-initdb.d` run **only when the data directory is empty**. Editing them later does nothing to an existing volume — `docker compose down -v` and start again, or add the change as a Prisma migration.

---

## 4. Connection

```dotenv
# .env  (git-ignored; commit .env.example with placeholders)
DATABASE_URL=postgresql://terraspace:terraspace@localhost:5432/terraspace
```

**`localhost`, not `postgres`.** The API runs on the host, so it reaches the database through the published port. (A service name like `postgres` only resolves *inside* a Compose network — that applies if the API is ever containerized too, which it is not here.)

`shared/config/env.js` validates this at boot ([`libraries.md`](./libraries.md) §8), so a missing or malformed URL fails immediately with a clear message rather than on the first query.

---

## 5. Everyday commands

```bash
# first run
cp .env.example .env
docker compose up -d
npx prisma migrate dev         # applies migrations + regenerates the client
npm run db:seed
npm run dev                    # node --watch src/server.js

# database lifecycle
docker compose up -d           # start
docker compose stop            # stop, keep data
docker compose down            # remove container, keep data
docker compose down -v         # remove container AND DELETE the data volume
docker compose logs -f postgres

# working with the data
docker compose exec postgres psql -U terraspace -d terraspace
npx prisma studio                              # from the host
npx prisma migrate dev --name add_payments     # new migration
npx prisma migrate reset                       # drop, re-migrate, re-seed
```

> **`down -v` deletes the database.** It is the right move when the schema is confused; destructive when it is not. `down` alone keeps the volume. `prisma migrate reset` is usually the gentler option — it keeps the container and replays migrations.

### Backing up a dev database

```bash
docker compose exec postgres pg_dump -U terraspace terraspace > backup.sql
cat backup.sql | docker compose exec -T postgres psql -U terraspace -d terraspace
```

Worth doing before `migrate reset` if the seed data took effort to build.

---

## 6. Tests use a different database

[`testing.md`](./testing.md) §6 starts its **own** PostgreSQL via Testcontainers. Do not point tests at this one.

| Reason | |
|---|---|
| Isolation | Tests `TRUNCATE` every table between cases — they would wipe your dev data on every run |
| Reproducibility | A fresh container starts from a known-empty state; a long-lived dev database accumulates |
| CI | There is no Compose stack there, only a Docker daemon |

Docker **is** required to run the integration suite — Testcontainers needs the daemon. That is the only overlap between the two.

---

## 7. Optional extras

Kept out of the default `up` with profiles, so `docker compose up -d` stays one container.

```yaml
  # docker compose --profile tools up -d
  mailpit:
    image: axllent/mailpit:latest
    profiles: [tools]
    ports: ["8025:8025", "1025:1025"]
```

**Mailpit is worth knowing about.** Better Auth runs with `requireEmailVerification: true` ([`features/auth.md`](./features/auth.md)), so **no account can sign in until it receives a verification email**. Options in development:

| Approach | Trade-off |
|---|---|
| Mailpit + `SMTP_HOST=localhost:1025` | Real flow, readable at `localhost:8025` |
| Resend with a test key | Real delivery; needs network and a key |
| Seed users with `emailVerified: true` | Simplest; skips the flow entirely, so it stays untested |

Seeding verified users is fine for day-to-day work — just do not let it be the *only* way accounts get created, or the verification path ships untested.

---

## 8. Common failures

| Symptom | Cause |
|---|---|
| `ECONNREFUSED 127.0.0.1:5432` | Container not running (`docker compose ps`), or still starting — the healthcheck has a 10s `start_period` |
| `port is already allocated` | A local PostgreSQL holds 5432 — remap to `5433:5432` (§2) |
| `type "gist" does not exist` / exclusion constraint fails | `btree_gist` missing — the init script did not run because the volume already existed (§3) |
| `password authentication failed` | `.env` credentials do not match the `POSTGRES_*` values; or the volume was created with older credentials — `down -v` to reset |
| Container restarts on boot after an image change | Data directory written by a different major version. Pin the tag (§2) |
| `init/*.sql` edits have no effect | Only runs on an empty data directory — `down -v` (§3) |
| Tests wiped my dev data | Tests were pointed at this database instead of Testcontainers (§6) |
| Migration applied but the app still errors | `prisma generate` not re-run — restart `npm run dev` |
