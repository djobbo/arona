import child from "node:child_process"
import path from "node:path"
import { rspack } from "@rspack/core"
import ReactRefreshPlugin from "@rspack/plugin-react-refresh"
import nodeExternals from "webpack-node-externals"

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
	const compiler = rspack({
		target: "node",
		mode: "development",
		entry: {
			main: ["webpack/hot/poll?100", entry],
		},
		devtool: "source-map",
		externals: [
			// @ts-expect-error - webpack-node-externals type is not compatible with rspack
			nodeExternals({
				allowlist: ["webpack/hot/poll"],
			}),
		],
		externalsPresets: {
			node: true,
		},
		plugins: [
			new ReactRefreshPlugin(),
			new rspack.HotModuleReplacementPlugin(),
		],
		output: {
			filename: outputFile,
			path: outputPath,
			clean: true,
		},
		module: {
			rules: [
				{
					test: /\.(j|t)sx?$/,
					use: {
						loader: "builtin:swc-loader",
						options: {
							jsc: {
								parser: {
									syntax: "typescript",
									tsx: true,
								},
								transform: {
									react: {
										runtime: "automatic",
										development: true,
										refresh: true,
									},
								},
							},
						},
					},
					type: "javascript/auto",
				},
			],
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js", ".jsx"],
		},
	})

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
