import { defineConfig } from "vite";

export default defineConfig({
  build: {
    lib: {
      entry: "spa-router.js",
      formats: ["es"],
      fileName: () => "spa-router.js",
    },
    minify: false,
  },
  test: {
    include: ["test/**/*.test.js"],
    environment: "node",
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
