import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    // The suite shares one MongoDB database and the module-level singletons in
    // src/services/**, so scenarios must not interleave.
    fileParallelism: false,
    sequence: { concurrent: false },
    testTimeout: 20_000,
    setupFiles: ["tests/setup.ts"],
  },
});
