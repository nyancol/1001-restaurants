import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts", "web/src/**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.opencode/**",
      "**/.stitch/**",
      "**/skills/**/test/**",
      "**/skills/**/tests/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "lcov"],
      // Floor = current reality (~64% lines, ~50% branches on 2026-11-22).
      // CI fails on regression below these; raise intentionally as tests grow.
      // Web i18n/lib/theme are largely untested — excluded from the ratchet
      // until Playwright smoke lands; backend src/ carries the gate.
      thresholds: {
        lines: 60,
        branches: 45,
        functions: 50,
        statements: 55,
      },
    },
  },
});
