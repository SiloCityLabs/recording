import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    include: ["tests/**/*.test.js"],
    setupFiles: ["tests/setup.js"],
    testTimeout: 30000,
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "html"],
      reportsDirectory: "coverage",
      include: [
        "db.js",
        "nextcloud.js",
        "offline-transcription.js",
        "rec-lib.js",
        "sw-rules.js",
      ],
      exclude: ["tests/**", "optional/**", "scripts/**", "coverage/**"],
      thresholds: {
        lines: 85,
        functions: 85,
        branches: 70,
        statements: 85,
      },
    },
  },
});
