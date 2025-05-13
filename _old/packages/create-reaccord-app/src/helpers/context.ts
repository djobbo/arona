import { type Task, prompt } from "@astrojs/cli-kit"
import arg from "arg"

import { detectPackageManager, getReaccordVersion } from "./packages.js"

export const DEFAULT_REF = "master"

export interface Context {
  help: boolean
  prompt: typeof prompt
  cwd: string
  packageManager: string
  reaccordVersion: Promise<string>
  dryRun?: boolean
  yes?: boolean
  projectName?: string
  template?: string
  ref: string
  install?: boolean
  git?: boolean
  stdin?: typeof process.stdin
  stdout?: typeof process.stdout
  exit(code: number): never
  tasks: Task[]
}

export async function getContext(argv: string[]): Promise<Context> {
  const flags = arg(
    {
      "--template": String,
      "--ref": String,
      "--yes": Boolean,
      "--no": Boolean,
      "--install": Boolean,
      "--no-install": Boolean,
      "--git": Boolean,
      "--no-git": Boolean,
      "--dry-run": Boolean,
      "--help": Boolean,

      "-y": "--yes",
      "-n": "--no",
      "-h": "--help",
    },
    { argv, permissive: true },
  )

  const packageManager = detectPackageManager() ?? "npm"
  let cwd = flags["_"][0]
  let {
    "--help": help = false,
    "--template": template,
    "--no": no,
    "--yes": yes,
    "--install": install,
    "--no-install": noInstall,
    "--git": git,
    "--no-git": noGit,
    "--dry-run": dryRun,
    "--ref": ref,
  } = flags
  let projectName = cwd

  if (no) {
    yes = false
    if (install == undefined) install = false
    if (git == undefined) git = false
  }

  const context: Context = {
    help,
    prompt,
    packageManager,
    reaccordVersion: getReaccordVersion(
      packageManager,
      process.env.REACCORD_VERSION,
    ),
    dryRun,
    projectName,
    template,
    ref: ref ?? DEFAULT_REF,
    yes,
    install: install ?? (noInstall ? false : undefined),
    git: git ?? (noGit ? false : undefined),
    cwd,
    exit(code) {
      process.exit(code)
    },
    tasks: [],
  }
  return context
}
