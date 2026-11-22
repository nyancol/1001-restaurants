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
  },
});
