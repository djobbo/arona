import type { Configuration } from "@rspack/core"
import { rspack } from "@rspack/core"
import ReactRefreshPlugin from "@rspack/plugin-react-refresh"
import nodeExternals from "webpack-node-externals"
import type { ExternalItemFunctionData } from "@rspack/core"

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
}: RspackConfigOptions): Configuration => {
  const plugins = []
  
  if (hot) {
    plugins.push(
      new ReactRefreshPlugin(),
      new rspack.HotModuleReplacementPlugin()
    )
  }

  return {
    target: "node",
    mode,
    entry: {
      main: hot ? ["webpack/hot/poll?100", entry] : entry,
    },
    devtool: mode === "development" ? "source-map" : false,
    externals: [
      // Use nodeExternals to handle most node_modules
      // @ts-expect-error - webpack-node-externals type is not compatible with rspack
      nodeExternals({
        allowlist: hot ? ["webpack/hot/poll"] : [],
      }),
    ],
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
          type: 'asset',
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx", ".node"],
    },
  }
} 