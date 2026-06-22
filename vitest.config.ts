import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // Run tests sequentially to avoid API rate limiting
    sequence: { concurrent: false },
    testTimeout: 120000,
  },
});
