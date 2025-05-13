import { rollup } from "rollup"
import type { OutputOptions, RollupOptions } from "rollup"
import type { ReaccordConfig } from "./types"

export const build = async (
  rollupConfig: RollupOptions,
  { entry }: ReaccordConfig,
) => {
  if (!entry) {
    console.error(Error("Entry point not specified in `reaccord.config.js`"))
    process.exit(1)
  }

  const output = await rollup({ ...rollupConfig, input: entry })
  output.write(rollupConfig.output as OutputOptions)
  return
}
