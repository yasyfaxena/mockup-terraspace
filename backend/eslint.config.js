import globals from "globals";
import js from "@eslint/js";
import prettier from "eslint-config-prettier";
import sonarjs from "eslint-plugin-sonarjs";
import promise from "eslint-plugin-promise";
import n from "eslint-plugin-n";

export default [
  js.configs.recommended,
  sonarjs.configs.recommended,
  promise.configs["flat/recommended"],
  n.configs["flat/recommended"],
  prettier,
  {
    languageOptions: {
      ecmaVersion: 2025,
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["error"] }],
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "n/no-missing-import": "error",
      "n/no-unpublished-import": "off",
      "sonarjs/no-duplicate-string": "off",
    },
  },
  {
    ignores: ["node_modules/", "coverage/", "prisma/"],
  },
];
