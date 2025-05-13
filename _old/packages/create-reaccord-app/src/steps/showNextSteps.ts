import { color } from "@astrojs/cli-kit"
import { log, stdout } from "../helpers/messages.js"
import { sleep } from "@astrojs/cli-kit/utils"
import path from "node:path"
import stripAnsi from "strip-ansi"
import type { Context } from "../helpers/context.js"

type NextStepsOptions = {
  projectDir: string
  devCmd: string
}

export const nextSteps = async ({ projectDir, devCmd }: NextStepsOptions) => {
  const max = stdout.columns
  const prefix = max < 80 ? " " : " ".repeat(9)
  await sleep(200)
  log(
    `\n ${color.bgHex("#0EC2BC")(" next ")}  ${color.bold(
      "Explore your project!",
    )}`,
  )

  await sleep(100)
  if (projectDir !== "") {
    projectDir = projectDir.includes(" ")
      ? `"./${projectDir}"`
      : `./${projectDir}`
    const enter = [
      `\n${prefix}Enter your project directory using`,
      color.cyan(`cd ${projectDir}`, ""),
    ]
    const len = enter[0].length + stripAnsi(enter[1]).length
    log(enter.join(len > max ? "\n" + prefix : " "))
  }
  log(
    `${prefix}Run ${color.cyan(devCmd)} to start the dev server. ${color.cyan("CTRL+C")} to stop.`,
  )
  await sleep(200)
}

export const showNextSteps = async (ctx: Context) => {
  let projectDir = path.relative(process.cwd(), ctx.cwd)

  const commandMap: { [key: string]: string } = {
    npm: "npm run dev",
    bun: "bun run dev",
    yarn: "yarn dev",
    pnpm: "pnpm dev",
  }

  const devCmd =
    commandMap[ctx.packageManager as keyof typeof commandMap] || "npm run dev"
  await nextSteps({ projectDir, devCmd })

  log("Have fun! 🚀")

  return
}
