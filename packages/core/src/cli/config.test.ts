import path from "node:path";
import { describe, expect, it } from "vite-plus/test";
import { createAronaViteConfig } from "./config";

describe("createAronaViteConfig", () => {
  it("builds a node SSR bundle with an index.js entry", () => {
    const entry = path.resolve("src/index.ts");
    const config = createAronaViteConfig({ entry, mode: "production" });

    expect(config.build?.ssr).toBe(entry);
    expect(config.build?.outDir).toBe(path.resolve(process.cwd(), "dist"));
    expect(config.build?.emptyOutDir).toBe(true);
    expect(config.build?.sourcemap).toBe(false);
    expect(config.build?.watch).toBeNull();
    expect(config.ssr?.target).toBe("node");
    expect(config.ssr).toEqual({ target: "node", external: ["@arona/core", "@arona/discord"] });
    expect(config.build?.rollupOptions?.output).toMatchObject({
      entryFileNames: "index.js",
      format: "esm",
    });
    expect(config.define).toEqual({ "process.env.NODE_ENV": '"production"' });
  });

  it("uses the requested output directory and dev options", () => {
    const outDir = path.resolve("tmp", "out");
    const config = createAronaViteConfig({
      entry: "src/index.ts",
      mode: "development",
      outDir,
      watch: true,
    });

    expect(config.build?.outDir).toBe(outDir);
    expect(config.build?.sourcemap).toBe(true);
    expect(config.build?.watch).toEqual({});
    expect(config.define).toEqual({ "process.env.NODE_ENV": '"development"' });
  });
});
