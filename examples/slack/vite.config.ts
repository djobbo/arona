import path from "node:path";
import { defineConfig } from "vite-plus";

const root = path.resolve(__dirname, "../..");

export default defineConfig({
  resolve: {
    alias: {
      "@arona/slack/testing": path.resolve(root, "packages/slack/src/testing/index.ts"),
      "@arona/slack": path.resolve(root, "packages/slack/src/index.ts"),
      "@arona/core": path.resolve(root, "packages/core/src/index.ts"),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
