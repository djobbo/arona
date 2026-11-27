import { defineConfig } from "vite-plus";

export default defineConfig({
  test: {
    include: ["scripts/**/*.test.ts"],
  },
});
