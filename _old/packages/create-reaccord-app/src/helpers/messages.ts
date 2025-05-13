import { exec } from "node:child_process"
/* eslint no-console: 'off' */
import { align, sleep } from "@astrojs/cli-kit/utils"
import { color, label, spinner as load } from "@astrojs/cli-kit"

export let stdout = process.stdout
/** @internal Used to mock `process.stdout.write` for testing purposes */
export function setStdout(writable: typeof process.stdout) {
  stdout = writable
}

export async function spinner(args: {
  start: string
  end: string
  onError?: (error: any) => void
  while: (...args: any) => Promise<any>
}) {
  await load(args, { stdout })
}

export const title = (text: string) =>
  align(label(text, color.bgHex("#5866F5")), "end", 7) + " "

export const getName = () =>
  new Promise<string>((resolve) => {
    exec("git config user.name", { encoding: "utf-8" }, (_1, gitName) => {
      if (gitName.trim()) {
        return resolve(gitName.split(" ")[0].trim())
      }
      exec("whoami", { encoding: "utf-8" }, (_3, whoami) => {
        if (whoami.trim()) {
          return resolve(whoami.split(" ")[0].trim())
        }
        return resolve("astronaut")
      })
    })
  })

export const log = (message: string) => stdout.write(message + "\n")

export const bannerAbort = () =>
  log(`\n${label("Reaccord", color.bgRed)} ${color.bold("failed to install.")}`)

export const info = async (prefix: string, text: string) => {
  await sleep(100)
  if (stdout.columns < 80) {
    log(`${" ".repeat(5)} ${color.cyan("◼")}  ${color.cyan(prefix)}`)
    log(`${" ".repeat(9)}${color.dim(text)}`)
  } else {
    log(
      `${" ".repeat(5)} ${color.cyan("◼")}  ${color.cyan(prefix)} ${color.dim(text)}`,
    )
  }
}
export const error = async (prefix: string, text: string) => {
  if (stdout.columns < 80) {
    log(`${" ".repeat(5)} ${color.red("▲")}  ${color.red(prefix)}`)
    log(`${" ".repeat(9)}${color.dim(text)}`)
  } else {
    log(
      `${" ".repeat(5)} ${color.red("▲")}  ${color.red(prefix)} ${color.dim(text)}`,
    )
  }
}
