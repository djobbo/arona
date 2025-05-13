import { bannerAbort, error, log } from "../helpers/messages.js"
import dns from "node:dns/promises"
import type { Context } from "../helpers/context.js"

export const checkOnline = async (ctx: Context) => {
  if (ctx.dryRun) return

  const online = await dns.lookup("github.com").then(
    () => true,
    () => false,
  )
  if (online) return

  bannerAbort()
  log("")
  error("error", `Unable to connect to the internet.`)
  ctx.exit(1)
}
