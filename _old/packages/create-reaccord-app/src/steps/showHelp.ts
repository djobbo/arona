import { color } from "@astrojs/cli-kit"
import { log, stdout, title } from "../helpers/messages.js"

type PrintHelpOptions = {
  commandName: string
  headline?: string
  usage?: string
  tables?: Record<string, [command: string, help: string][]>
  description?: string
}

const printHelp = ({
  commandName,
  headline,
  usage,
  tables,
  description,
}: PrintHelpOptions) => {
  const linebreak = () => ""
  const table = (
    rows: [string, string][],
    { padding }: { padding: number },
  ) => {
    const split = stdout.columns < 60
    let raw = ""

    for (const row of rows) {
      if (split) {
        raw += `    ${row[0]}\n    `
      } else {
        raw += `${`${row[0]}`.padStart(padding)}`
      }
      raw += "  " + color.dim(row[1]) + "\n"
    }

    return raw.slice(0, -1) // remove latest \n
  }

  let message = []

  if (headline) {
    message.push(
      linebreak(),
      `${title(commandName)} ${color.green(`v${process.env.PACKAGE_VERSION ?? ""}`)} ${headline}`,
    )
  }

  if (usage) {
    message.push(
      linebreak(),
      `${color.green(commandName)} ${color.bold(usage)}`,
    )
  }

  if (tables) {
    function calculateTablePadding(rows: [string, string][]) {
      return rows.reduce((val, [first]) => Math.max(val, first.length), 0)
    }
    const tableEntries = Object.entries(tables)
    const padding = Math.max(
      ...tableEntries.map(([, rows]) => calculateTablePadding(rows)),
    )
    for (const [, tableRows] of tableEntries) {
      message.push(linebreak(), table(tableRows, { padding }))
    }
  }

  if (description) {
    message.push(linebreak(), `${description}`)
  }

  log(message.join("\n") + "\n")
}

export const showHelp = () => {
  printHelp({
    commandName: "create-reaccord-app",
    usage: "[dir] [...flags]",
    headline: "Scaffold Reaccord projects.",
    tables: {
      Flags: [
        ["--help (-h)", "See all available flags."],
        ["--template <name>", "Specify your template."],
        ["--install / --no-install", "Install dependencies (or not)."],
        ["--git / --no-git", "Initialize git repo (or not)."],
        ["--yes (-y)", "Skip all prompts by accepting defaults."],
        ["--no (-n)", "Skip all prompts by declining defaults."],
        ["--dry-run", "Walk through steps without executing."],
        ["--ref", "Choose reaccord branch (default: latest)."],
      ],
    },
  })
}
