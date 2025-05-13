import { bannerAbort, error, info, log } from "../helpers/messages.js"
import { color } from "@astrojs/cli-kit"
import { getTemplateTarget } from "../helpers/template.js"
import { parseGitURI } from "../helpers/parseGitURI.js"
import type { Context } from "../helpers/context.js"

const verifyTemplate = async (tmpl: string, ref?: string) => {
  const target = getTemplateTarget(tmpl, ref)
  const {
    repo,
    subdir,
    ref: branch,
  } = parseGitURI(target.replace("github:", ""))

  const url = new URL(
    `/repos/${repo}/contents${subdir}?ref=${branch}`,
    "https://api.github.com/",
  )

  let res = await fetch(url.toString(), {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
    },
  })

  // If users hit a ratelimit, fallback to the GitHub website
  if (res.status === 403) {
    res = await fetch(`https://github.com/${repo}/tree/${branch}${subdir}`)
  }

  return res.status === 200
}

export const checkTemplate = async (ctx: Context) => {
  if (!ctx.template) return

  const ok = await verifyTemplate(ctx.template, ctx.ref)
  if (ok) return

  bannerAbort()
  log("")
  error(
    "error",
    `Template ${color.reset(ctx.template)} ${color.dim("could not be found!")}`,
  )
  await info("check", "https://github.com/djobbo/reaccord/tree/master/examples")
  ctx.exit(1)
}
