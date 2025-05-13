import ReactRefreshWebpackPlugin from "@pmmmwh/react-refresh-webpack-plugin"
import child from "node:child_process"
import nodeExternals from "webpack-node-externals"
import path from "node:path"
import webpack from "webpack"

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
  callback: (
    err: Error | null | undefined,
    stats: webpack.Stats | undefined,
  ) => void,
) => {
  const config: webpack.Configuration = {
    target: "node",
    mode: "development",
    entry: [`${require.resolve("webpack/hot/poll")}?1000`, entry],
    devtool: "inline-source-map",
    externals: [nodeExternals()],
    externalsPresets: {
      node: true,
    },
    plugins: [
      new webpack.HotModuleReplacementPlugin(),
      new ReactRefreshWebpackPlugin(),
    ],
    output: {
      filename: outputFile,
      path: outputPath,
      clean: true,
    },
    module: {
      rules: [
        {
          test: /\.[jt]sx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: require.resolve("babel-loader"),
              options: {
                plugins: [require.resolve("react-refresh/babel")],
              },
            },
            {
              loader: require.resolve("ts-loader"),
            },
          ],
        },
      ],
    },
    resolve: {
      extensions: [".tsx", ".ts", ".js", ".jsx"],
    },
  }

  const compiler = webpack(config)

  return compiler.watch({}, callback)
}

export const dev = async (entry: string, argv: string[] = []) => {
  console.log("⚙️ Starting development server...")

  const rootPath = process.cwd()
  const outputFolder = path.resolve(rootPath, ".reaccord")
  const outputFile = "bot.js"
  const outputPath = path.join(outputFolder, outputFile)

  await new Promise<void>((resolve, reject) => {
    startDevServer({ entry, outputFile, outputFolder }, (err, stats) => {
      if (err) {
        console.error({ err })
        reject(err)
        return
      }

      if (stats?.hash) {
        resolve()
      }
    })
  })

  console.log("⬆️ Development server is up!")

  child.fork(outputPath, argv, {
    env: {
      ...process.env,
      NODE_ENV: "development",
    },
    stdio: "inherit",
  })
}
