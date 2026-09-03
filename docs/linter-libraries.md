# TerraSpace — Linter & Libraries

## 1. Linter & Code Quality

### ESLint 9

**Why:**
It's the standard choice for React + TypeScript projects, and v9's flat config is simpler to maintain long-term.

Purpose:

- JavaScript/TypeScript linting
- React Hooks rules (`eslint-plugin-react-hooks`) → prevents common bugs like an incorrect `useEffect` dependency array
- React Refresh rules (`eslint-plugin-react-refresh`) → keeps Vite's HMR (Fast Refresh) working correctly

Packages used:

- `@eslint/js`
- `typescript-eslint`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `eslint-config-prettier` (so ESLint and Prettier rules don't conflict)

```bash
npm run lint
```

### Prettier

**Why:**
Separates formatting concerns from code-quality concerns. ESLint focuses on bugs/logic, Prettier focuses on writing style (indentation, quotes, etc.) — so there's no style debate between developers.

```bash
npx prettier --check .
```

### TypeScript (strict mode)

**Why:**
Adds a compile-time validation layer before code even runs. Especially useful with Prisma + Zod, since types can flow end-to-end from DB → API → FE.

```bash
npx tsc --noEmit
```

**Decision:** ESLint + Prettier + TypeScript is sufficient. No additional linter needed (e.g. Biome/StandardJS) — it would overlap in function and add complexity without new benefit.

---

## 2. Libraries

**Principle:** only keep/add libraries that genuinely support the current architecture, and **avoid duplicating** libraries for the same purpose (it bloats the bundle and makes the project harder to maintain).

| Category                     | Selected library      | Why no alternative was added                                       |
| ---------------------------- | --------------------- | ------------------------------------------------------------------ |
| Forms                        | React Hook Form       | Already efficient (uncontrolled), no need for Formik etc.          |
| Validation                   | Zod                   | Already integrated with RHF + type inference, no need for Yup etc. |
| ORM                          | Prisma                | Already type-safe with PostgreSQL, no need for Drizzle/TypeORM     |
| Data fetching / server state | TanStack Query        | Already covers caching & server sync, no need for SWR/Redux-Saga   |
| Routing                      | TanStack Router/Start | File-based, type-safe                                              |
| UI primitives                | Radix UI              | Headless, accessible by default                                    |
| Styling                      | Tailwind CSS          | Utility-first, pairs well with Radix                               |
| Notifications                | Sonner                | Lightweight, sufficient for toast needs                            |
| Icons                        | Lucide React          | Consistent with the Radix ecosystem                                |
| Dates                        | date-fns              | Modular, tree-shakable (vs. moment.js)                             |

> **Note:** Capacitor was removed from the list since TerraSpace is currently **web-only** — there's no need to build a native Android/iOS app yet. It can be added back later if there's a plan to expand into mobile.

---

## 3. Version Philosophy

"Latest" is not always "best." A version is chosen for being **stable and well-supported by its ecosystem**, not for being the newest tag on npm.

Rules applied:

1. **New major release** (e.g. Prisma 8, ESLint 10): wait until the plugin ecosystem has caught up.
2. **RC / beta / alpha tags**: never used in production.
3. **Minor/patch updates within the same major**: safe to update regularly.
4. **Packages that release very frequently** (TanStack ecosystem): pin an exact version instead of auto-updating.

---

## 4. Mockup vs. Recommended Version — Comparison Table

Checked against the actual `package.json` in the TerraSpace mockup project.

| Package                             | In Mockup           | Recommended                           | Reason                                                       |
| ----------------------------------- | ------------------- | ------------------------------------- | ------------------------------------------------------------ |
| `prisma` / `@prisma/client`         | `5.22.0`            | **`7.x`**                             | Two majors behind. v8 is still RC, not production-ready.     |
| `zod`                               | `3.24.2`            | **`4.x`**                             | Ecosystem (RHF resolvers, TanStack) has already moved to v4. |
| `nitro`                             | `3.0.260603-beta`   | **latest stable release**             | Still on a beta tag — risky for production.                  |
| `@tanstack/react-start`             | `1.168.32`          | **pin exact, a build ~2–4 weeks old** | Ships near-daily; avoid the newest untested build.           |
| `@tanstack/react-router`            | `1.170.18`          | **pin exact, latest stable**          | Same reasoning as react-start.                               |
| `@tanstack/router-plugin`           | `1.168.23`          | **pin exact, matching react-start**   | Must always match the react-start version.                   |
| `@tanstack/react-query`             | `5.101.1`           | **`5.10x.x`**                         | Close to latest already, safe to update regularly.           |
| `eslint`                            | `9.32.0`            | **`9.x`** ✅                          | v10's plugin ecosystem isn't fully caught up yet.            |
| `typescript-eslint`                 | `8.56.1`            | **`8.x`** ✅                          | Already mature for ESLint 9 + TypeScript.                    |
| `prettier`                          | `3.7.3`             | **`3.7.x`** ✅                        | Formatting features are already sufficient.                  |
| `typescript`                        | `5.8.3`             | **`5.8.x`** ✅                        | Already stable.                                              |
| `vite`                              | `8.2.0`             | **`8.x`** ✅                          | Already latest and stable.                                   |
| `tailwindcss` / `@tailwindcss/vite` | `4.2.1`             | **`4.3.x`**                           | Minor bump within the same major, low risk.                  |
| `react` / `react-dom`               | `19.2.0`            | **`19.x`** ✅                         | Already mature.                                              |
| `react-hook-form`                   | `7.71.2`            | **`7.x`** ✅                          | Already latest.                                              |
| `@hookform/resolvers`               | `5.2.2`             | **`5.x`** ✅                          | Fine, but re-check after upgrading Zod to v4.                |
| `date-fns`                          | `4.1.0`             | **`4.x`** ✅                          | Already latest major.                                        |
| `lucide-react`                      | `0.575.0`           | **`0.x`, latest minor**               | Routine minor updates, not critical.                         |
| `sonner`                            | `2.0.7`             | **`2.x`** ✅                          | Already latest major.                                        |
| `@radix-ui/react-*`                 | mixed `1.x` / `2.x` | **latest per package**                | Radix ships per-package; update individually.                |

### Top 3 Findings

1. **Prisma is still v5** — furthest from the recommendation; should be the first migration priority.
2. **Zod is still v3** — ecosystem-wide move to v4 makes this second priority.
3. **Capacitor is still installed** even though the spec says "web-only" — needs a decision: remove it, or update this spec if mobile is now planned.

---

## 5. Scripts

```json
{
  "scripts": {
    "lint": "eslint .",
    "check:type": "tsc --noEmit",
    "format": "prettier --write ."
  }
}
```

Recommended CI checks (fastest to slowest):

```bash
npm run lint
npx prettier --check .
npm run check:type
```

---

## 6. Decision Summary

| Area          | Decision                            |
| ------------- | ----------------------------------- |
| Linter        | ESLint 9                            |
| Formatter     | Prettier                            |
| Type checking | TypeScript (strict)                 |
| Validation    | Zod (v4)                            |
| ORM           | Prisma (v7, stable — not the v8 RC) |
| Forms         | React Hook Form                     |
| Data fetching | TanStack Query                      |
| Routing       | TanStack Router/Start               |
| UI primitives | Radix UI                            |
| Styling       | Tailwind CSS                        |

**Conclusion:** keep the existing tooling and library choices as-is (no additions needed), but align actual `package.json` versions with what's stable and well-supported today, not just the newest tag on npm.
