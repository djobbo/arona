import path from "node:path"
import { rspack } from "@rspack/core"
import { createRspackConfig } from "./rspack.config"

export const build = async (entry: string) => {
  console.log("🏗️ Starting production build...")

  const rootPath = process.cwd()
  const outputFolder = path.resolve(rootPath, "dist")
  const outputFile = "index.js"

  const compiler = rspack(
    createRspackConfig({
      entry,
      outputFile,
      outputFolder,
      mode: "production",
      hot: false,
    })
  )

  return new Promise<void>((resolve, reject) => {
    compiler.run((err, stats) => {
      if (err) {
        console.error("Build failed:", err)
        reject(err)
        return
      }

      if (stats?.hasErrors()) {
        console.error("Build failed with errors:", stats.toString())
        reject(new Error("Build failed with errors"))
        return
      }

      console.log("✅ Build completed successfully!")
      console.log(stats?.toString({
        chunks: false,
        colors: true,
      }))
      resolve()
    })
  })
} 