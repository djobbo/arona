import path from "node:path";
import type { InlineConfig } from "vite";

export interface AronaViteConfigOptions {
  /** Absolute path to the user's bot entry module. */
  readonly entry: string;
  /** Build mode, which also selects the sourcemap and NODE_ENV values. */
  readonly mode: "development" | "production";
  /** Absolute output directory. Defaults to `<cwd>/dist`. */
  readonly outDir?: string;
  /** Rebuild when an input changes. */
  readonly watch?: boolean;
}

/**
 * Builds the Vite config used by the `arona` CLI.
 *
 * Bots are Node programs, so the entry is built as an SSR bundle: Vite keeps
 * node_modules external, preserving native modules and peer singletons.
 */
export const createAronaViteConfig = ({
  entry,
  mode,
  outDir,
  watch = false,
}: AronaViteConfigOptions): InlineConfig => {
  const outputDir = outDir ?? path.resolve(process.cwd(), "dist");

  return {
    configFile: false,
    root: process.cwd(),
    mode,
    logLevel: "info",
    define: {
      "process.env.NODE_ENV": JSON.stringify(mode),
    },
    build: {
      ssr: entry,
      outDir: outputDir,
      emptyOutDir: true,
      target: "node22",
      minify: false,
      sourcemap: mode === "development",
      watch: watch ? {} : null,
      rollupOptions: {
        output: {
          entryFileNames: "index.js",
          format: "esm",
        },
      },
    },
    ssr: {
      target: "node",
      external: ["@arona/core", "@arona/discord"],
    },
  };
};
