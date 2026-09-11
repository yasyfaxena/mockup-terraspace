# TerraSpace — Linting & Code Quality (V2 FE)

**Language:** TypeScript, strict — **not** dropped, unlike the backend
**Stack:** ESLint 9 (flat config) · typescript-eslint · eslint-plugin-react-hooks · eslint-plugin-react-refresh · eslint-plugin-boundaries · Prettier

**Companion:** [`fe-architecture.md`](./fe-architecture.md) · [`testing.md`](./testing.md) · [BE `linter.md`](../BE/linter.md) · [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md)

> **Why this document exists despite `docs/BE/linter-libraries.md` §1 already covering ESLint/Prettier/TypeScript for this app.** That document is V1's linter spec, written before the feature-based `src/features/` split. V2 keeps every tool it chose and adds exactly one: boundary enforcement for the new folder structure (§7) — the same gap [BE `linter.md`](../BE/linter.md) §8 closes on the backend.

---

## 1. What stays from V1

Nothing is replaced. [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §1 already established:

| Tool | Role |
|---|---|
| ESLint 9 (flat config) | Bugs, React Hooks correctness, Fast Refresh compatibility |
| `typescript-eslint` | Type-aware linting on top of `tsc --noEmit` |
| Prettier | Formatting only, `eslint-config-prettier` last in the chain |

This means the frontend keeps every rule the backend explicitly gave up when it dropped TypeScript — [BE `linter.md`](../BE/linter.md) §1's "lost" table (`no-floating-promises`, `no-misused-promises`, `await-thenable`, `switch-exhaustiveness-check`, `noUncheckedIndexedAccess`) is **not lost here**. `tsconfig.json` strict mode plus `typescript-eslint`'s type-checked rules already cover it — no `checkJs`-equivalent workaround is needed on this side of the project.

---

## 2. What V2 adds

| Tool | Catches | Cannot catch |
|---|---|---|
| **ESLint + typescript-eslint** | Bugs, complexity limits, React correctness — within one file's imports | Whether a file is imported by anything, or which feature it belongs to |
| **`eslint-plugin-boundaries`** (new, §7) | A feature importing another feature's `*.api.ts`, or `shared/`/`lib/` importing from `features/` | Anything inside a function body |
| **Prettier** | Formatting | Everything else |

No Knip-equivalent dead-code scanner is added in V2. Unlike the backend ([BE `linter.md`](../BE/linter.md) §2, "Knip matters more without TypeScript"), `tsc`'s own unused-export and unused-import diagnostics, plus Vite's build output, already surface most of what Knip finds — a dedicated dead-file scanner is worth revisiting only if that stops being true in practice.

---

## 3. Hard limits

Carried over from [`CODE_STRUCTURE.md`](../../../CODE_STRUCTURE.md) and this package's own [`frontend-spec.md`](./frontend-spec.md) §16, tightened to match the backend's enforced-not-just-suggested approach ([BE `linter.md`](../BE/linter.md) §3):

| Limit | Value | Rule |
|---|---|---|
| Lines per file | **400** (warn) · 700 (error) | `max-lines` — same split rationale as [BE `linter.md`](../BE/linter.md) §3: 400 is the design guideline from `fe-architecture.md` §5, 700 is where a reviewer stops reading it properly |
| Lines per function/component | 80 | `max-lines-per-function` |
| Nesting depth | ≤ 3 | `max-depth` |
| Cyclomatic complexity | ≤ 10 | `complexity` |
| Parameters | ≤ 4 (use a props object past that) | `max-params` |
| Magic numbers | Banned outside `shared/constants.ts` | `no-magic-numbers` |

`CODE_STRUCTURE.md`'s existing 300-line guideline for route/page files stays a guideline (routes legitimately compose a full page); `features/**/*.ts(x)` files are held to the stricter 400/700 split because a feature module, unlike a route, is supposed to be one cohesive slice.

---

## 4. React-specific rules

Already in place per [`docs/BE/linter-libraries.md`](../../BE/linter-libraries.md) §1 — restated here because they matter more once feature folders hold real business logic in hooks, not just presentational components:

```js
"react-hooks/rules-of-hooks": "error",
"react-hooks/exhaustive-deps": "error",
"react-refresh/only-export-components": "warn",
```

| Rule | Why it matters in `features/*.queries.ts` |
|---|---|
| `exhaustive-deps` | A query hook that closes over a filter param without listing it in its `queryKey` (see [`state-map.md`](./state-map.md) §2) silently serves stale data — this rule is the syntactic half of catching that; the semantic half is code review against the query-key table |
| `react-refresh/only-export-components` | Feature files increasingly export non-component values (`queryKeys`, schemas, hooks) alongside components — `warn`, not `error`, since `index.ts` barrels legitimately do this by design |

---

## 5. Async correctness

TypeScript-aware rules cover most of what [BE `linter.md`](../BE/linter.md) §6 has to reconstruct without a type checker:

```js
"@typescript-eslint/no-floating-promises": "error",
"@typescript-eslint/no-misused-promises": "error",
"@typescript-eslint/await-thenable": "error",
"@typescript-eslint/no-unnecessary-condition": "warn",
```

The one gap TypeScript does **not** close: a mutation's `onError` silently missing. Nothing type-checks "every `useMutation` call site handles its error path" — that is a review discipline backed by [`error-handling.md`](./error-handling.md) §1's rule that a swallowed error never appears, and by the tests in [`testing.md`](./testing.md) §3 asserting the handler actually ran.

---

## 6. Naming and magic values

Same principle as [BE `linter.md`](../BE/linter.md) §5, applied to the frontend's own vocabulary:

```js
// shared/constants.ts — unchanged from V1, per CODE_STRUCTURE.md
export const MIN_BOOKING_MINUTES = 30;
export const MAX_CALENDAR_RANGE_DAYS = 92;
```

TypeScript unions already give compile-time protection for status/enum strings coming from the API (`BookingStatus = "pending" | "confirmed" | ...`, derived via `z.infer`) — the frozen-object workaround [BE `linter.md`](../BE/linter.md) §5 needs for plain JavaScript is not required here. `id-length` is not adopted; TypeScript's inferred types make short names like `id`, `tx`-style abbreviations unambiguous without a lint rule policing them.

---

## 7. Architectural rules — the actual V2 addition

Encodes [`fe-architecture.md`](./fe-architecture.md) §7, the same way [BE `linter.md`](../BE/linter.md) §8 encodes the backend's own boundaries:

```js
// eslint.config.js
settings: {
  "boundaries/elements": [
    { type: "feature",    pattern: "src/features/*",          capture: ["name"] },
    { type: "featureApi", pattern: "src/features/*/index.ts", capture: ["name"] },
    { type: "shared",     pattern: "src/shared/*" },
    { type: "lib",        pattern: "src/lib/*" },
    { type: "route",      pattern: "src/routes/*" },
    { type: "ui",         pattern: "src/components/*" },
  ],
},
rules: {
  "boundaries/element-types": ["error", {
    default: "disallow",
    rules: [
      { from: "feature",    allow: ["shared", "lib", "ui", "featureApi", ["feature", { name: "${from.name}" }]] },
      { from: "featureApi", allow: ["shared", "lib", "ui", ["feature", { name: "${from.name}" }]] },
      { from: "shared",     allow: ["shared"] },              // never imports a feature
      { from: "lib",        allow: ["shared"] },              // never imports a feature
      { from: "route",      allow: ["shared", "lib", "ui", "featureApi"] },
      { from: "ui",         allow: ["ui"] },                  // never imports a feature — see fe-architecture.md Phase 1
    ],
  }],
},

// *.api.ts is never imported from outside its own feature
{
  files: ["src/features/*/*.ts", "src/features/*/*.tsx"],
  ignores: ["src/features/*/*.api.ts"],
  rules: {
    "no-restricted-imports": ["error", {
      patterns: [{ group: ["**/features/*/*.api"], message: "Import the feature's query hooks, not its api.ts, from outside the feature." }],
    }],
  },
},
```

The `ui` rule enforces [`development-phases.md`](./development-phases.md) Phase 1's exit criterion directly: `components/ui/*` importing from `features/*` fails CI rather than being caught in review months later.

---

## 8. Prettier

Unchanged from V1 (`docs/BE/linter-libraries.md` §1's Prettier section) — same config the whole repo already uses, no divergence for `src/features/`.

---

## 9. Scripts and CI

```jsonc
{
  "scripts": {
    "lint": "eslint .",
    "lint:fix": "eslint . --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "check:type": "tsc --noEmit",
    "check": "npm run format:check && npm run lint && npm run check:type"
  }
}
```

Fastest to slowest, matching [BE `linter.md`](../BE/linter.md) §14's ordering rationale:

```bash
npm run format:check   # seconds
npm run lint           # ~10s
npm run check:type     # ~20s
npm run test:unit      # unit + integration, MSW-mocked — see testing.md
npm run test:e2e       # slowest — Playwright against a running BE/
```

---

## 10. Adoption

Lower-risk than the backend's ratchet ([BE `linter.md`](../BE/linter.md) §15) — nothing here is turned on for the first time, only extended to a folder structure that does not exist yet:

| Phase | Action |
|---|---|
| 1 | Add `eslint-plugin-boundaries` config (§7) scoped to `src/features/**` — the folder is empty in `fe-architecture.md` Phase 0/1, so it starts strict from the first file |
| 2 | As each `development-phases.md` phase adds a feature, its folder is boundary-clean from day one — never a retrofit |
| 3 | Once `src/frontend/` and `src/backend/` are deleted ([`development-phases.md`](./development-phases.md) Phase 8), widen the `default: "disallow"` boundary rule to cover the whole `src/` tree with no legacy exemption |

---

## 11. Summary

| Concern | Tool |
|---|---|
| Type safety | TypeScript strict + `typescript-eslint` — kept from V1, unlike the backend |
| Async correctness | `@typescript-eslint/no-floating-promises` and friends — type-aware, not reconstructed |
| React correctness | `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` |
| File/function size | `max-lines` (400/700), `max-lines-per-function` (80) |
| Feature boundaries | **`eslint-plugin-boundaries`** — the one addition this document makes |
| Formatting | Prettier (last in the chain) |
| Dead code | `tsc` + build output — no dedicated scanner added |
