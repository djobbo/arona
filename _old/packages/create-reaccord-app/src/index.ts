import { applyTemplate } from "./steps/applyTemplate.js"
import { checkOnline } from "./steps/checkOnline.js"
import { checkTemplate } from "./steps/checkTemplate.js"
import { getContext } from "./helpers/context.js"
import { initGit } from "./steps/initGit.js"
import { installDependencies } from "./steps/installDependencies.js"
import { promptProjectName } from "./steps/promptProjectName.js"
import { setStdout } from "./helpers/messages.js"
import { showHelp } from "./steps/showHelp.js"
import { showNextSteps } from "./steps/showNextSteps.js"
import { tasks } from "@astrojs/cli-kit"

const exit = () => process.exit(0)
process.on("SIGINT", exit)
process.on("SIGTERM", exit)

export async function main() {
  // Add some extra spacing from the noisy npm/pnpm init output
  // eslint-disable-next-line no-console
  console.log("")
  // NOTE: In the v7.x version of npm, the default behavior of `npm init` was changed
  // to no longer require `--` to pass args and instead pass `--` directly to us. This
  // broke our arg parser, since `--` is a special kind of flag. Filtering for `--` here
  // fixes the issue so that create-reaccord-app now works on all npm versions.
  const cleanArgv = process.argv.slice(2).filter((arg) => arg !== "--")
  const ctx = await getContext(cleanArgv)

  if (ctx.help) {
    showHelp()
    return
  }

  const steps = [
    checkOnline,
    checkTemplate,
    promptProjectName,
    applyTemplate,
    installDependencies,

    // Steps which write to files need to go above git
    initGit,
  ]

  for (const step of steps) {
    await step(ctx)
  }

  // eslint-disable-next-line no-console
  console.log("")

  const labels = {
    start: "Project initializing...",
    end: "Project initialized!",
  }
  await tasks(labels, ctx.tasks)

  await showNextSteps(ctx)

  process.exit(0)
}

export {
  applyTemplate,
  checkOnline,
  checkTemplate,
  installDependencies,
  showHelp,
  showNextSteps,
  //
  getContext,
  initGit,
  promptProjectName,
  setStdout,
}
