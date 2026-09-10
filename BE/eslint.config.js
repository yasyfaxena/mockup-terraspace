import globals from "globals";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import promise from "eslint-plugin-promise";
import n from "eslint-plugin-n";
import boundaries from "eslint-plugin-boundaries";
import importPlugin from "eslint-plugin-import";
import jsdoc from "eslint-plugin-jsdoc";

export default [
  { ignores: ["node_modules/", "coverage/", "prisma/", "vendor/**"] },

  js.configs.recommended,
  sonarjs.configs.recommended,
  promise.configs["flat/recommended"],
  n.configs["flat/recommended"],

  {
    files: ["src/**/*.js"],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: { ...globals.node },
    },
    plugins: { boundaries, import: importPlugin, jsdoc },
    settings: {
      // linter.md §8 predates eslint-plugin-boundaries v7: element patterns
      // are folder-only now (index.js and app.js/server.js can't be their
      // own element type), so the featureApi/app split from the doc is
      // expressed here as file categories instead.
      "boundaries/elements": [
        { type: "feature", pattern: "src/features/*", capture: ["name"] },
        { type: "shared", pattern: "src/shared/*" },
      ],
      "boundaries/files": [
        { category: "featureApi", pattern: "src/features/*/index.js" },
        { category: "app", pattern: "src/{app,server}.js" },
      ],
    },
    rules: {
      /* ---- size & complexity (linter.md §3) ---- */
      "max-lines": ["error", { max: 700, skipBlankLines: true, skipComments: true }],
      "max-lines-per-function": [
        "error",
        { max: 80, skipBlankLines: true, skipComments: true, IIFEs: true },
      ],
      "max-depth": ["error", { max: 3 }],
      "max-params": ["error", { max: 4 }],
      "max-nested-callbacks": ["error", { max: 3 }],
      complexity: ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 15],

      /* ---- naming (linter.md §4) ---- */
      "id-length": [
        "error",
        { min: 3, properties: "never", exceptions: ["id", "db", "tx", "to", "q", "_"] },
      ],
      camelcase: ["error", { properties: "never" }],

      /* ---- magic values (linter.md §5) ---- */
      "no-magic-numbers": [
        "error",
        {
          ignore: [0, 1, -1],
          ignoreArrayIndexes: true,
          ignoreDefaultValues: true,
          enforceConst: true,
          detectObjects: false,
        },
      ],
      "sonarjs/no-duplicate-string": ["error", { threshold: 3 }],

      /* ---- async correctness (linter.md §6) ---- */
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

      /* ---- node & express (linter.md §7) ---- */
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
      // req/res are Express's own mutation surface — every middleware in
      // this codebase (and in Express generally) communicates by writing
      // properties onto them (be-architecture.md, shared/middleware/**).
      "no-param-reassign": [
        "error",
        { props: true, ignorePropertyModificationsFor: ["req", "res"] },
      ],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],

      /* ---- duplication ---- */
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-collapsible-if": "error",
      "import/no-cycle": ["error", { maxDepth: Infinity }],

      /* ---- boundaries (linter.md §8, adapted to plugin v7 — see settings above) ---- */
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            // A feature may always import shared/.
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // A feature may import another feature's public barrel (index.js) — any feature.
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { type: "feature" }, file: { categories: "featureApi" } } },
            },
            // A feature may deep-import its own internal files (same captured name).
            {
              from: { element: { type: "feature" } },
              allow: {
                to: {
                  element: {
                    type: "feature",
                    captured: { name: "{{from.element.captured.name}}" },
                  },
                },
              },
            },
            // shared/ never imports a feature, only more of itself.
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // app.js/server.js may import each other (server.js boots app.js), shared/, and any feature's barrel.
            {
              from: { file: { categories: "app" } },
              allow: { to: { file: { categories: "app" } } },
            },
            {
              from: { file: { categories: "app" } },
              allow: { to: { element: { type: "shared" } } },
            },
            {
              from: { file: { categories: "app" } },
              allow: { to: { element: { type: "feature" }, file: { categories: "featureApi" } } },
            },
          ],
        },
      ],

      /* ---- jsdoc (linter.md §11.5) ---- */
      "jsdoc/require-param": "error",
      "jsdoc/require-param-type": "error",
      "jsdoc/require-returns": "error",
      "jsdoc/require-returns-type": "error",
      "jsdoc/check-param-names": "error",
      "jsdoc/check-tag-names": "error",
      "jsdoc/check-types": "error",
      "jsdoc/no-undefined-types": "error",
      "jsdoc/valid-types": "error",
      "jsdoc/no-blank-blocks": "error",
      "jsdoc/informative-docs": "error",
      "jsdoc/tag-lines": ["error", "any", { startLines: 0 }],
      "jsdoc/require-param-description": "off",
      "jsdoc/require-returns-description": "off",
    },
  },

  /* ---- containment (linter.md §8): Prisma only inside repositories ---- */
  {
    files: ["src/**/*.js"],
    ignores: ["src/**/*.repository.js", "src/shared/database/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [{ name: "@prisma/client", message: "Prisma belongs in a *.repository.js file." }],
        },
      ],
    },
  },
  /* ---- containment: process.env only in config ---- */
  {
    files: ["src/**/*.js"],
    ignores: ["src/shared/config/env.js"],
    rules: {
      "no-restricted-properties": [
        "error",
        {
          object: "process",
          property: "env",
          message: "Read configuration from shared/config/env.js.",
        },
      ],
    },
  },

  /* ---- JSDoc required only on the layers linter.md §11.1 names ---- */
  {
    files: [
      "src/**/*.service.js",
      "src/**/*.repository.js",
      "src/**/*.mapper.js",
      "src/shared/lib/**/*.js",
    ],
    rules: {
      "jsdoc/require-jsdoc": [
        "error",
        {
          publicOnly: true,
          require: { FunctionDeclaration: true, MethodDefinition: true, ClassDeclaration: true },
        },
      ],
    },
  },

  /* ---- tests exempt from size & magic-value rules (linter.md §9) ---- */
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: { ...globals.node, ...globals.vitest },
    },
    rules: {
      "no-console": ["warn", { allow: ["error"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      "n/no-missing-import": "error",
      "max-lines": "off",
      "max-lines-per-function": "off",
      "no-magic-numbers": "off",
      "sonarjs/no-duplicate-string": "off",
      "id-length": "off",
      "n/no-unpublished-import": "off",
      // A test's job is to be explicit and repetitive (linter.md §9) — this
      // extends past the doc's own listed exemptions to two more rules that
      // only make sense for production code: fixture passwords aren't
      // secrets, and asserting exact rounding *is* the point of a rounding test.
      "sonarjs/no-hardcoded-passwords": "off",
      "sonarjs/no-floating-point-equality": "off",
      "sonarjs/no-unused-vars": "off",
    },
  },

  /* ---- root tooling config files: devDependency imports are expected ---- */
  {
    files: ["*.config.js"],
    rules: {
      "n/no-unpublished-import": "off",
    },
  },

  prettier,
];
