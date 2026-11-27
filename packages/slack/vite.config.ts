import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: { index: "src/index.ts", testing: "src/testing/index.ts" },
    outExtensions: ({ format }) => ({
      js: format === "es" ? ".js" : ".cjs",
      dts: format === "es" ? ".d.ts" : ".d.cts",
    }),
    dts: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
