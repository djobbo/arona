import type { Configuration, Plugin } from "@rspack/core"
import { rspack } from "@rspack/core"
import ReactRefreshPlugin from "@rspack/plugin-react-refresh"

export interface RspackConfigOptions {
	entry: string
	outputFile: string
	outputFolder: string
	mode: "development" | "production"
	hot?: boolean
}

export const createRspackConfig = ({
	entry,
	outputFile,
	outputFolder,
	mode,
	hot = false,
}: RspackConfigOptions) => {
	const plugins: Plugin[] = []

	if (hot) {
		plugins.push(
			new ReactRefreshPlugin(),
			new rspack.HotModuleReplacementPlugin(),
		)
	}

	const config: Configuration = {
		target: "node",
		mode,
		entry: {
			main: hot ? ["webpack/hot/poll?100", entry] : entry,
		},
		devtool: mode === "development" ? "source-map" : false,
		externalsPresets: {
			node: true,
		},
		plugins,
		output: {
			filename: outputFile,
			path: outputFolder,
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
										development: mode === "development",
										refresh: hot,
									},
								},
							},
						},
					},
					type: "javascript/auto",
				},
				{
					test: /\.node$/,
					loader: "node-loader",
					type: "javascript/auto",
				},
				{
					test: /\.woff2$/,
					type: "asset",
				},
			],
		},
		resolve: {
			extensions: [".tsx", ".ts", ".js", ".jsx", ".node"],
		},
	}

	return config
}
