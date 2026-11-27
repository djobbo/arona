import { build as viteBuild } from "vite";
import { createAronaViteConfig } from "./config";

/** Builds a bot entry for production into `<cwd>/dist/index.js`. */
export const build = async (entry: string): Promise<void> => {
  console.log("🏗️ Starting production build...");
  await viteBuild(createAronaViteConfig({ entry, mode: "production" }));
  console.log("✅ Build completed successfully!");
};
