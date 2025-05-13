import type { Context } from "../helpers/context.js"

import { color } from "@astrojs/cli-kit"
import { copyTemplate } from "../helpers/template.js"
import { error, info, title } from "../helpers/messages.js"
import type { Choice } from "@astrojs/cli-kit/types"

const templates = [
  {
    value: "simple-counter",
    label: "Simple Counter",
    hint: "(recommended)",
  },
  {
    value: "rick-and-morty-api",
    label: "Rick and Morty API",
  },
] as const satisfies Choice[]

type Template = (typeof templates)[number]["value"]

const DEFAULT_TEMPLATE: Template = "simple-counter"

export const applyTemplate = async (ctx: Context) => {
  if (!ctx.template && ctx.yes) ctx.template = DEFAULT_TEMPLATE

  if (ctx.template) {
    await info(
      "tmpl",
      `Using ${color.reset(ctx.template)}${color.dim(" as project template")}`,
    )
  } else {
    const { template: tmpl } = await ctx.prompt({
      name: "template",
      type: "select",
      label: title("tmpl"),
      message: "How would you like to start your new project?",
      initial: DEFAULT_TEMPLATE,
      choices: templates,
    })

    ctx.template = tmpl
  }

  if (ctx.dryRun) {
    await info("--dry-run", `Skipping template copying`)
  } else if (ctx.template) {
    ctx.tasks.push({
      pending: "Template",
      start: "Template copying...",
      end: "Template copied",
      while: () =>
        copyTemplate(ctx.template!, ctx as Context).catch((e) => {
          if (e instanceof Error) {
            error("error", e.message)
            process.exit(1)
          } else {
            error("error", "Unable to clone template.")
            process.exit(1)
          }
        }),
    })
  } else {
    ctx.exit(1)
  }
}
