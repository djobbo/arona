import child from "node:child_process"
import path from "node:path"
import { rspack } from "@rspack/core"
import { createRspackConfig } from "./rspack.config"

const startDevServer = async (
	{
		entry,
		outputFile,
		outputFolder: outputPath,
	}: {
		entry: string
		outputFile: string
		outputFolder: string
	},
	callback: Parameters<typeof rspack.Compiler.prototype.watch>[1],
) => {
	const compiler = rspack(
		createRspackConfig({
			entry,
			outputFile,
			outputFolder: outputPath,
			mode: "development",
			hot: true,
		})
	)

	compiler.hooks.watchRun.tap("WatchRunPlugin", (compiler) => {
		console.log("Compilation starting after file change...")
	})

	return compiler.watch(
		{
			ignored: /node_modules/,
			aggregateTimeout: 300,
			poll: 1000,
		},
		callback,
	)
}

export const dev = async (entry: string, argv: string[] = []) => {
	console.log("⚙️ Starting development server...")

	const rootPath = process.cwd()
	const outputFolder = path.resolve(rootPath, "node_modules", ".arona")
	const outputFile = "index.js"
	const outputPath = path.join(outputFolder, outputFile)

	let childProcess: child.ChildProcess | null = null

	await new Promise<void>((resolve, reject) => {
		startDevServer({ entry, outputFile, outputFolder }, (err, stats) => {
			if (err) {
				console.error({ err })
				reject(err)
				return
			}

			if (stats?.hash) {
				if (!childProcess) {
					childProcess = child.fork(outputPath, argv, {
						env: {
							...process.env,
							NODE_ENV: "development",
						},
						stdio: "inherit",
					})

					resolve()
					console.log("⬆️ Development server is up!")
				}
				// Don't restart the process - let HMR handle the updates
			}
		})
	})

	console.log("⬆️ Development server is ready for HMR!")
}
