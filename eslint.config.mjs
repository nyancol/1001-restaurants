// ESLint flat config — JS + Prettier-compatible.
// NOTE: typescript-eslint is intentionally NOT used: repo pins TypeScript ^7
// (see package.json) whose peer range (<6.1) conflicts with typescript-eslint v8.
// Type safety is enforced by `npm run typecheck` (tsc --noEmit) in CI.
// Revisit when typescript-eslint supports TS 7.
import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "coverage/**",
      "public/**",
      "web/public/**",
      ".opencode/**",
      ".stitch/**",
      "skills/**/test/**",
      "skills/**/tests/**",
      "skills/**/*.md",
      "data/**",
    ],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node, ...globals.browser },
    },
    rules: {
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_", caughtErrors: "none" }],
      "no-console": "off",
    },
  },
];
