# TerraSpace — Linting & Code Quality (V2)

**Language:** JavaScript (ESM, Node 20+) — **not** TypeScript
**Stack:** ESLint 9 (flat config) · eslint-plugin-sonarjs · eslint-plugin-promise · eslint-plugin-n · eslint-plugin-jsdoc · eslint-plugin-boundaries · Knip · Prettier

**Companion:** [`be-architecture.md`](./be-architecture.md) · [`testing.md`](./testing.md) · [`docker.md`](./docker.md)

> **Note:** [`docs/BE/backend-spec.md`](../../BE/backend-spec.md) §1 lists TypeScript, and the existing web app is TypeScript. This document assumes the backend is plain JavaScript, as directed. Worth reconciling that spec so the two do not disagree.

---

## 1. What plain JavaScript costs, and how to cover it

Being direct: dropping TypeScript removes the two highest-value lint rules available to an Express codebase, because they need type information.

| Lost | What it caught |
|---|---|
| `no-floating-promises` | An un-awaited database write that silently never runs, and rejections that vanish |
| `no-misused-promises` | An `async` function passed where a void callback is expected |
| `await-thenable` | `await` on a non-promise — usually a forgotten call |
| `no-unnecessary-condition` | Checks that are always true |
| `switch-exhaustiveness-check` | A `switch` missing a new enum case |
| `noUncheckedIndexedAccess` | `arr[0]` being `undefined` |

Three layers replace them:

| Layer | Covers |
|---|---|
| **`eslint-plugin-promise`** (§6) | Most floating-promise and async-misuse cases, syntactically |
| **Zod at every boundary** (§7) | Shape correctness at runtime — now the *only* thing checking it |
| **`checkJs`** (§10, optional) | Restores the full type-aware rule set **without writing TypeScript** |

§10 is worth reading before deciding. It gives back `no-floating-promises` on `.js` files with no build step and no syntax change.

---

## 2. Three tools, no overlap

| Tool | Catches | Cannot catch |
|---|---|---|
| **ESLint** | Bugs, complexity limits, boundaries — within one file's imports | Whether a file is imported by anything |
| **Knip** | **Dead files, unused exports, unused dependencies** — project-wide | Anything inside a function body |
| **Prettier** | Formatting | Everything else |

> **Knip matters more without TypeScript.** With no compiler pass, nothing else in the toolchain looks at the project as a whole. Knip is the only thing that will tell you a module is unreachable or a dependency is unused.

---

## 3. Hard limits

| Limit | Value | Rule |
|---|---|---|
| Lines per file | **700** (error) · 400 (warn) | `max-lines` |
| Lines per function | **80** | `max-lines-per-function` |
| Blank lines & comments | **Not counted** | `skipBlankLines` + `skipComments` |
| Identifier length | **≥ 3 characters** | `id-length` |
| Nesting depth | **≤ 3** | `max-depth` |
| Cyclomatic complexity | ≤ 10 | `complexity` |
| Cognitive complexity | ≤ 15 | `sonarjs/cognitive-complexity` |
| Parameters | ≤ 4 | `max-params` |
| Nested callbacks | ≤ 3 | `max-nested-callbacks` |
| Magic numbers | Banned | `no-magic-numbers` |
| Duplicate strings | ≤ 2 occurrences | `sonarjs/no-duplicate-string` |

### The 400 / 700 split

[`be-architecture.md`](./be-architecture.md) §5 sets ~400 lines as the point to split a file. That stays a **warning** — design guidance, and a service legitimately sits at 450 mid-refactor. **700 is the error**: past that a file does several jobs and no reviewer reads it properly.

Same for functions: 80 real lines of logic is already long. Comments and blank lines are excluded so nobody is penalized for documenting or for readable spacing.

---

## 4. `id-length` — read before enabling

`min: 3` rejects `id`, and **every entity in the ERD has an `id`**. Without exceptions the codebase cannot lint at all.

```js
"id-length": ["error", {
  min: 3,
  properties: "never",          // booking.id and { id: … } untouched
  exceptions: [
    "id",   // ERD primary key — unavoidable
    "db",   // Prisma client
    "tx",   // transaction client
    "to",   // date ranges: { from, to }
    "q",    // search query parameter
    "_",    // intentionally unused
  ],
}]
```

| Setting | Why |
|---|---|
| `properties: "never"` | Object keys and member access are data shapes, not names you chose |
| `exceptions` | Genuinely 2-character domain vocabulary. Keep it **short**; justify additions in review |

Correctly rejected: `const w = await repo.find(…)`, `.map(b => b.total)`, `catch (e)`. Write `workspace`, `booking`, `error`.

---

## 5. Magic numbers and strings

### Numbers

```js
"no-magic-numbers": ["error", {
  ignore: [0, 1, -1],
  ignoreArrayIndexes: true,
  ignoreDefaultValues: true,
  enforceConst: true,
  detectObjects: false,
}]
```

```js
// ✗
if (durationMinutes < 30) throw new BookingMinDurationError();

// ✓
const MINIMUM_BOOKING_MINUTES = 30;
if (durationMinutes < MINIMUM_BOOKING_MINUTES) throw new BookingMinDurationError();
```

`0`, `1` and `-1` stay allowed — banning them produces `const ZERO = 0`, which is noise.

### Strings — two layers

**Layer 1: frozen constant objects.** Without TypeScript unions there is no compile-time protection, so the discipline matters more. Centralize every domain string:

```js
// shared/constants/booking.js
export const BOOKING_STATUS = Object.freeze({
  pending: "pending", confirmed: "confirmed",
  cancelled: "cancelled", completed: "completed",
});

export const BOOKING_STATUSES = Object.freeze(Object.values(BOOKING_STATUS));
```

```js
// ✗ typo is silent at every level
if (booking.status === "confirmd") { … }

// ✓ throws at import time on a typo, and greps cleanly
if (booking.status === BOOKING_STATUS.confirmed) { … }
```

Derive the Zod schema from the same object so validation and code can never disagree:

```js
const bookingStatusSchema = z.enum(BOOKING_STATUSES);
```

**Layer 2: lint.** `sonarjs/no-duplicate-string` flags any literal repeated 3+ times:

```js
"sonarjs/no-duplicate-string": ["error", { threshold: 3 }]
```

This is the practical magic-string rule — ESLint core has none, and repetition is the signal that matters.

### Optional: ban literal comparisons outright

```js
"no-restricted-syntax": ["error", {
  selector: "BinaryExpression[operator=/^[=!]==?$/] > Literal[value=/^[A-Za-z_]{2,}$/]",
  message: "Compare against a frozen constant, not a string literal.",
}]
```

Strict and noisy. Enable once the constants in Layer 1 exist.

---

## 6. Async correctness — the critical section for JavaScript

Express plus `async` plus no type checker is where this codebase will actually break. These rules are the substitute for `no-floating-promises`.

```js
"promise/catch-or-return":        ["error", { allowFinally: true }],
"promise/always-return":          "error",
"promise/no-nesting":             "error",
"promise/no-return-wrap":         "error",
"promise/param-names":            "error",
"promise/no-multiple-resolved":   "error",
"promise/prefer-await-to-then":   "error",
"promise/prefer-await-to-callbacks": "error",

"require-atomic-updates": "error",   // async read-modify-write races
"no-return-await":        "error",
"no-async-promise-executor": "error",
"no-await-in-loop":       "warn",    // usually wants Promise.all
```

### The gap that remains

`eslint-plugin-promise` is syntactic. It **cannot** see this:

```js
// no rule catches this in plain JS — the write silently never happens
async function cancelBooking(id) {
  bookingsRepository.update(id, { status: BOOKING_STATUS.cancelled });   // missing await
  return { success: true };
}
```

Two defences:

1. **`checkJs`** (§10) — restores `no-floating-promises` properly. The real fix.
2. **Convention, enforced in review:** every repository call is `await`ed or explicitly returned. Integration tests ([`testing.md`](./testing.md)) catch it by asserting the database actually changed — not just the response body.

> Assert on **persisted state**, not only the HTTP response. A missing `await` returns a perfectly correct-looking `200` while writing nothing.

---

## 7. Node and Express rules

```js
"n/prefer-node-protocol": "error",   // import from "node:crypto"
"n/no-sync":              "error",   // blocking I/O stalls the event loop
"n/no-process-exit":      "error",   // use the graceful shutdown path
"n/handle-callback-err":  "error",
"n/no-missing-import":    "error",   // ESM: a typo'd path fails at runtime, not build
"n/no-unpublished-import": "error",  // devDependency imported from src/

"consistent-return": "error",        // Express handlers: return next(err) or respond, not both
"no-shadow":         "error",
"default-param-last": "error",
"eqeqeq":            ["error", "always"],
"no-console":        "error",        // logs go through pino, with redaction
"prefer-const":      "error",
"no-param-reassign": ["error", { props: true }],
```

**`n/no-missing-import` earns its place.** In ESM without a compiler, a mistyped import path is a runtime crash on first require — often in production, on a rarely-hit route. This is the closest thing JavaScript has to the compiler catching it.

**`consistent-return`** matters specifically in Express: forgetting `return` before `next(err)` lets a handler continue and try to respond twice.

---

## 8. Architectural rules

Encodes [`be-architecture.md`](./be-architecture.md) §7 so boundaries fail in CI, not review.

```js
settings: {
  "boundaries/elements": [
    { type: "feature",    pattern: "src/features/*",          capture: ["name"] },
    { type: "featureApi", pattern: "src/features/*/index.js", capture: ["name"] },
    { type: "shared",     pattern: "src/shared/*" },
    { type: "app",        pattern: "src/{app,server}.js" },
  ],
},
rules: {
  "boundaries/element-types": ["error", {
    default: "disallow",
    rules: [
      { from: "feature",    allow: ["shared", "featureApi", ["feature", { name: "${from.name}" }]] },
      { from: "featureApi", allow: ["shared", ["feature", { name: "${from.name}" }]] },
      { from: "shared",     allow: ["shared"] },   // never imports a feature
      { from: "app",        allow: ["shared", "featureApi"] },
    ],
  }],
  "import/no-cycle": ["error", { maxDepth: Infinity }],
},
```

Plus two containment rules:

```js
// Prisma only inside repositories
{
  files: ["src/**/*.js"],
  ignores: ["src/**/*.repository.js", "src/shared/database/**"],
  rules: {
    "no-restricted-imports": ["error", {
      paths: [{ name: "@prisma/client", message: "Prisma belongs in a *.repository.js file." }],
    }],
  },
},
// process.env only in config
{
  files: ["src/**/*.js"],
  ignores: ["src/shared/config/env.js"],
  rules: {
    "no-restricted-properties": ["error", {
      object: "process", property: "env",
      message: "Read configuration from shared/config/env.js.",
    }],
  },
},
```

---

## 9. Full ESLint config

```js
// eslint.config.js
import js from "@eslint/js";
import globals from "globals";
import sonarjs from "eslint-plugin-sonarjs";
import promise from "eslint-plugin-promise";
import n from "eslint-plugin-n";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import prettier from "eslint-config-prettier";

export default [
  { ignores: ["dist/**", "coverage/**", "node_modules/**", "src/generated/**"] },

  js.configs.recommended,

  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2023,
      sourceType: "module",
      globals: { ...globals.node },
    },
    plugins: { sonarjs, promise, n, boundaries, import: importPlugin },
    rules: {
      /* ---- size & complexity ---- */
      "max-lines": ["error", { max: 700, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": ["error", { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true }],
      "max-depth": ["error", { max: 3 }],
      "max-params": ["error", { max: 4 }],
      "max-nested-callbacks": ["error", { max: 3 }],
      complexity: ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 15],

      /* ---- naming ---- */
      "id-length": ["error", { min: 3, properties: "never", exceptions: ["id", "db", "tx", "to", "q", "_"] }],
      camelcase: ["error", { properties: "never" }],

      /* ---- magic values ---- */
      "no-magic-numbers": ["error", {
        ignore: [0, 1, -1], ignoreArrayIndexes: true,
        ignoreDefaultValues: true, enforceConst: true, detectObjects: false,
      }],
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],

      /* ---- async (see §6) ---- */
      "promise/catch-or-return": ["error", { allowFinally: true }],
      "promise/always-return": "error",
      "promise/no-nesting": "error",
      "promise/no-return-wrap": "error",
      "promise/param-names": "error",
      "promise/no-multiple-resolved": "error",
      "promise/prefer-await-to-then": "error",
      "promise/prefer-await-to-callbacks": "error",
      "require-atomic-updates": "error",
      "no-async-promise-executor": "error",
      "no-return-await": "error",
      "no-await-in-loop": "warn",

      /* ---- node & express (see §7) ---- */
      "n/prefer-node-protocol": "error",
      "n/no-sync": "error",
      "n/no-process-exit": "error",
      "n/handle-callback-err": "error",
      "n/no-missing-import": "error",
      "n/no-unpublished-import": "error",
      "consistent-return": "error",
      "no-shadow": "error",
      "default-param-last": "error",
      eqeqeq: ["error", "always"],
      "no-console": "error",
      "prefer-const": "error",
      "no-param-reassign": ["error", { props: true }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      /* ---- duplication ---- */
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "import/no-cycle": ["error", { maxDepth: Infinity }],
    },
  },

  /* ---- boundaries & containment: see §8 ---- */

  /* ---- tests exempt from size & magic-value rules ---- */
  {
    files: ["tests/**/*.js"],
    languageOptions: { globals: { ...globals.node, ...globals.vitest } },
    rules: {
      "max-lines": "off",
      "max-lines-per-function": "off",
      "no-magic-numbers": "off",
      "sonarjs/no-duplicate-string": "off",
      "id-length": "off",
      "n/no-unpublished-import": "off",
    },
  },

  prettier,   // must be last
];
```

> **`prettier` goes last.** It disables every formatting rule so ESLint and Prettier cannot disagree. Placed earlier, later configs re-enable rules that then fight the formatter on every save.

Tests are exempt deliberately: a test's job is to be explicit and repetitive. `expect(total).toBe("166.50")` *is* the assertion — extracting it to a constant makes the test worse.

---

## 10. Optional: type checking without TypeScript

**Recommended.** This restores every rule listed in §1 while keeping `.js` files, no build step, and no syntax change.

```jsonc
// jsconfig.json
{
  "compilerOptions": {
    "checkJs": true,
    "allowJs": true,
    "noEmit": true,
    "strict": true,
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "target": "es2023",
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*.js", "tests/**/*.js"]
}
```

```jsonc
{ "scripts": { "check:types": "tsc --noEmit -p jsconfig.json" } }
```

Types come from JSDoc where inference is not enough:

```js
/**
 * @param {import("@prisma/client").PrismaClient} db
 * @param {{ workspaceId: string, bookingDate: string }} input
 * @returns {Promise<import("./bookings.types.js").BookingDto>}
 */
async function create(db, input) { … }
```

Most value needs no annotation at all — Prisma ships its own types, Zod infers from schemas, and `checkJs` follows both.

| Cost | Benefit |
|---|---|
| `typescript` as a devDependency | `no-floating-promises` and the rest of §1 back |
| One extra CI step (~20s) | Typos in property names caught before runtime |
| Occasional `@ts-expect-error` | Prisma and Zod types flow end-to-end |

**Still shipping plain JavaScript** — `tsc` only reads, never emits. Nothing in the runtime changes.

If this is adopted, add `typescript-eslint` in type-aware mode over `.js` files and re-enable `no-floating-promises`, `no-misused-promises` and `await-thenable`. Start with `checkJs` as a warning-only CI step and ratchet.

---

## 11. JSDoc — the documentation standard

**JSDoc is the project's only code-documentation format.** In plain JavaScript it does double duty: with `checkJs` (§10) the same comment that documents a function also types it. One comment, two jobs — which is the entire reason to standardize on it rather than free-form prose.

### 11.1 Where it goes

| Location | Required | Why |
|---|---|---|
| `*.service.js` — exported methods | **Yes** — `@param`, `@returns`, `@throws` | The business contract; the only layer with real rules |
| `*.repository.js` — exported methods | **Yes** — `@param`, `@returns` | Callers need the row shape without opening Prisma |
| `*.mapper.js` — exported functions | **Yes** — `@returns` | The DTO shape *is* the API contract |
| `*.types.js` | **It is entirely JSDoc** — `@typedef` only | See §11.3 |
| `shared/lib/*`, `shared/errors/*` | **Yes** | Used everywhere; no context at the call site |
| `index.js` re-exports | No | The re-exported symbol carries its own |
| `*.controller.js` | No | Signature is always `(req, res, next)` |
| `*.routes.js` | No | The route table is the documentation |
| Internal (non-exported) helpers | Only when non-obvious | |

The rule underneath: **document what crosses a boundary.** Anything another file can call needs a contract; anything private to one file usually does not.

### 11.2 The tag set

Keep it small. Only these are allowed:

| Tag | Use |
|---|---|
| `@param` | Every parameter, with a type |
| `@returns` | Non-void returns, with a type |
| `@throws` | **Every domain error a service can throw** — see below |
| `@typedef` / `@property` | Shapes in `*.types.js` |
| `@type` | A variable inference cannot work out |
| `@example` | Sparingly, for non-obvious utilities only |

Banned: `@author`, `@date`, `@version`, `@since` — git records all of it, and these go stale immediately.

**`@throws` matters more here than usual.** [`error-handling.md`](./error-handling.md) makes the thrown error class the contract that maps to a status code. A caller cannot know a service throws `SlotTakenError` without either reading the whole method or seeing it documented:

```js
/**
 * Creates a booking, computing the price server-side.
 *
 * @param {import("./bookings.types.js").CreateBookingInput} input
 * @param {{ id: string, role: string }} actor
 * @returns {Promise<import("./bookings.types.js").BookingDto>}
 * @throws {SlotTakenError} the exclusion constraint rejected the insert
 * @throws {WorkspaceNotBookableError} workspace is disabled, maintenance or full
 * @throws {AdvanceBookingExceededError} beyond adminSettings.advanceBookingDays
 */
async create(input, actor) { … }
```

### 11.3 `*.types.js` — one source of truth

Each feature's typedefs live in one file that **exports nothing at runtime**:

```js
// features/bookings/bookings.types.js

/**
 * @typedef {object} BookingDto
 * @property {string} id
 * @property {string} reference
 * @property {string} bookingDate   ISO date, YYYY-MM-DD
 * @property {string} totalAmount   decimal string — never a number
 * @property {import("../../shared/constants/booking.js").BookingStatus} status
 */

export {};   // makes this a module; without it the typedefs are global
```

**Derive input types from the Zod schema rather than restating them.** Hand-written typedefs for request bodies drift from validation within a sprint:

```js
// features/bookings/bookings.schema.js
import { z } from "zod";

export const createBookingSchema = z.object({
  workspaceId: z.string().uuid(),
  bookingDate: z.string().date(),
  startTime:   z.string().regex(TIME_PATTERN),
  endTime:     z.string().regex(TIME_PATTERN),
});

/** @typedef {z.infer<typeof createBookingSchema>} CreateBookingInput */
```

The Zod schema validates at runtime *and* generates the type *and* feeds `zod-openapi` ([`libraries.md`](./libraries.md) §5). One definition, three uses — nothing can disagree with anything else.

### 11.4 What not to write

```js
// ✗ restates the signature and adds nothing
/**
 * Gets a booking.
 * @param {string} id The id.
 * @returns {object} The booking.
 */

// ✗ documents what the code already says
// increment the counter
counter += 1;

// ✓ documents why, which the code cannot say
// Only pending/confirmed block a slot — the partial index on the exclusion
// constraint excludes cancelled rows, so a cancellation frees the time immediately.
```

`jsdoc/informative-docs` (§11.5) catches the first case automatically. The second is a review concern: **comments explain why, JSDoc declares the contract.** Neither should paraphrase the code.

### 11.5 Enforcement

```js
// eslint.config.js — add to the plugins and rules from §9
import jsdoc from "eslint-plugin-jsdoc";

{
  plugins: { jsdoc },
  rules: {
    "jsdoc/require-param":        "error",
    "jsdoc/require-param-type":   "error",
    "jsdoc/require-returns":      "error",
    "jsdoc/require-returns-type": "error",
    "jsdoc/check-param-names":    "error",
    "jsdoc/check-tag-names":      "error",
    "jsdoc/check-types":          "error",
    "jsdoc/no-undefined-types":   "error",
    "jsdoc/valid-types":          "error",
    "jsdoc/no-blank-blocks":      "error",
    "jsdoc/informative-docs":     "error",
    "jsdoc/tag-lines":            ["error", "any", { startLines: 0 }],

    // descriptions are optional — see below
    "jsdoc/require-param-description":   "off",
    "jsdoc/require-returns-description": "off",
  },
},

// JSDoc is REQUIRED only on the layers in §11.1
{
  files: ["src/**/*.service.js", "src/**/*.repository.js", "src/**/*.mapper.js", "src/shared/lib/**/*.js"],
  rules: {
    "jsdoc/require-jsdoc": ["error", {
      publicOnly: true,
      require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
    }],
  },
},
```

Two deliberate choices:

| Setting | Why |
|---|---|
| `require-*-description: "off"` | Forcing one produces `@param {string} email The email.` — pure noise. The type and name usually say it; write a description only when they do not |
| `informative-docs: "error"` | Actively flags a description that merely restates the name. This is what stops JSDoc degrading into boilerplate everyone skims past |

`require-jsdoc` is scoped by file glob, not global — controllers and routes stay clean.

### 11.6 What JSDoc is *not* for

| Concern | Lives in |
|---|---|
| HTTP endpoints, payloads, status codes | [`features/*.md`](./features/) + `zod-openapi` |
| Database schema | [`erd-spec.md`](./erd-spec.md) |
| Folder and layer rules | [`be-architecture.md`](./be-architecture.md) |
| Error catalog | [`error-handling.md`](./error-handling.md) §7 |

**Do not document endpoints in JSDoc.** The OpenAPI spec is generated from the Zod schemas, so a JSDoc endpoint comment is a second description that will disagree with the first. JSDoc documents *code contracts* — functions, parameters, returns, throws. The HTTP contract is generated.

```bash
npm i -D eslint-plugin-jsdoc
```

---

## 12. Knip

Finds what ESLint cannot: files nothing imports, exports nothing uses, dependencies nothing needs.

```jsonc
// knip.json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/server.js", "src/jobs/**/*.js", "prisma/seed.js"],
  "project": ["src/**/*.js", "prisma/**/*.js"],
  "ignore": ["src/generated/**"],
  "ignoreDependencies": [],
  "ignoreBinaries": ["prisma"],
  "vitest": { "config": ["vitest.config.js"], "entry": ["tests/**/*.test.js"] },
  "prisma": true,
  "rules": {
    "files": "error",
    "dependencies": "error",
    "unlisted": "error",
    "exports": "warn",
    "duplicates": "error"
  }
}
```

| Rule | Finds | Why it matters |
|---|---|---|
| `files` | Files no entry point reaches | Dead modules still maintained and reviewed |
| `dependencies` | Packages nothing imports | Install time, audit surface |
| `unlisted` | Imports **not** in `package.json` | Works locally via hoisting, breaks in a clean production install |
| `exports` | Exported but never imported | A leftover, or a boundary leak |
| `duplicates` | The same symbol exported twice | Two names for one thing, drifting |

### Entry points must be complete

Anything unreachable from `entry` is reported as dead. **A missing entry produces a flood of false positives** — the usual reason teams abandon Knip.

| Entry | Why it is not reachable from `server.js` |
|---|---|
| `src/jobs/**` | Cron tasks registered by the scheduler, not imported by the app graph |
| `prisma/seed.js` | Run by the Prisma CLI |
| `tests/**/*.test.js` | Run by Vitest (handled by the plugin) |

### Barrel files

`exports` is `warn`, not `error`, deliberately. Feature `index.js` barrels ([`be-architecture.md`](./be-architecture.md) §3) legitimately export a service only a sibling feature imports, and Knip's view is correct but noisy mid-development. Review the warnings — an export nothing imports **is** dead code — but do not block CI on them.

Do not add barrels to `entry`. That silences the check and hides genuinely dead exports.

---

## 13. Prettier

```jsonc
// .prettierrc
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

`endOfLine: "lf"` matters on Windows — without it, CRLF checkouts make every file show as modified in CI.

---

## 14. Scripts and CI

```jsonc
{
  "type": "module",
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check:types": "tsc --noEmit -p jsconfig.json",
    "check:dead": "knip",
    "check": "npm run format:check && npm run lint && npm run check:types && npm run check:dead"
  }
}
```

Fastest to slowest, so CI fails early:

```bash
npm run format:check   # seconds
npm run lint           # ~10s
npm run check:types    # ~20s   (only with §10)
npm run check:dead     # ~30s   needs the full graph
npm test               # slowest — Testcontainers starts PostgreSQL
```

`"type": "module"` is required — the config above assumes ESM.

### Pre-commit

```jsonc
{ "*.js": ["eslint --fix --max-warnings=0", "prettier --write"] }
```

Knip and `tsc` stay out of pre-commit — both need the whole project and would make every commit slow. They belong in CI.

---

## 15. Adoption

Turning all of this on at once produces thousands of errors and gets switched off. Ratchet:

| Phase | Action |
|---|---|
| 1 | Prettier across the repo, one formatting commit, `.git-blame-ignore-revs` so history stays readable |
| 2 | Correctness rules — §6 async and §7 Node — as `error`. Non-negotiable |
| 3 | Size and complexity limits as **`warn`**; record the baseline |
| 4 | Boundaries as `error` — new code cannot violate them |
| 5 | Knip with `files` + `dependencies` as `error`, `exports` as `warn` |
| 6 | `checkJs` (§10) as a warning-only step; fix what it finds — those are real bugs |
| 7 | Flip §3 limits to `error` once the warning count reaches zero |

`--max-warnings` in CI, lowered as the count falls, stops the ratchet slipping.

**Never** blanket-disable a file. A single-line disable is fine and must carry a reason:

```js
// eslint-disable-next-line no-magic-numbers -- SQLSTATE for exclusion violation
if (err.code === "23P01") throw new SlotTakenError();
```

---

## 16. Summary

| Concern | Tool |
|---|---|
| Async correctness | `eslint-plugin-promise` + `require-atomic-updates` — **and §10 for the rest** |
| Runtime shape safety | Zod at every boundary — the only checker without §10 |
| Bad import paths | `n/no-missing-import` |
| File ≤ 700, function ≤ 80 | `max-lines`, `max-lines-per-function` (blanks/comments excluded) |
| Names ≥ 3 chars | `id-length` **with the §4 exceptions** |
| Nesting ≤ 3, complexity ≤ 10 | `max-depth`, `complexity`, `sonarjs/cognitive-complexity` |
| Magic numbers | `no-magic-numbers` |
| Magic strings | Frozen constant objects first, `sonarjs/no-duplicate-string` second |
| Feature boundaries | `eslint-plugin-boundaries` |
| Dead files, exports, deps | **Knip** |
| Formatting | Prettier (last in the chain) |
| Code documentation | **JSDoc** — see §11; doubles as types under `checkJs` |

```bash
npm i -D eslint @eslint/js globals prettier eslint-config-prettier \
         eslint-plugin-sonarjs eslint-plugin-promise eslint-plugin-n \
         eslint-plugin-boundaries eslint-plugin-import \
         eslint-plugin-jsdoc knip lint-staged husky

# optional, for §10
npm i -D typescript
```
