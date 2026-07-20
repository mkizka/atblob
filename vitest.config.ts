import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: ["packages/*", "e2e"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["packages/**/*.ts"],
      exclude: ["packages/*/dist/**"],
    },
  },
});
