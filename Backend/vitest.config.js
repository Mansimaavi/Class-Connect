import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    setupFiles: ["./tests/setup/env.js"],
    testTimeout: 20_000,
    hookTimeout: 120_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "lcov"],
      include: ["app.js", "config/**", "Controllers/**", "middleware/**", "models/**", "routes/**", "services/**", "socket/**", "utils/**", "validators/**"],
    },
    projects: [
      {
        extends: true,
        test: { name: "unit", include: ["tests/unit/**/*.test.js"] },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.js"],
          // Uses MONGO_URI_TEST when set (CI provides a MongoDB service),
          // otherwise starts an in-memory MongoDB.
          globalSetup: ["./tests/setup/globalSetup.js"],
        },
      },
    ],
  },
});
