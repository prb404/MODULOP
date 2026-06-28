import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.js"],
    pool: "threads",
    fileParallelism: false,
    maxWorkers: 1,
    clearMocks: true
  }
});
