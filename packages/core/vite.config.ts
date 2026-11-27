import { defineConfig } from "vite-plus";

export default defineConfig({
  pack: {
    entry: {
      index: "src/index.ts",
      cli: "src/cli/index.ts",
    },
    outExtensions: ({ format }) => ({
      js: format === "es" ? ".js" : ".cjs",
      dts: format === "es" ? ".d.ts" : ".d.cts",
    }),
    format: ["esm", "cjs"],
    dts: true,
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
