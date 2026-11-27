import path from "node:path";
import { defineConfig } from "vite-plus";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@arona/discord/testing": path.resolve(root, "packages/discord/src/testing.ts"),
      "@arona/discord": path.resolve(root, "packages/discord/src/index.ts"),
      "@arona/core": path.resolve(root, "packages/core/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
