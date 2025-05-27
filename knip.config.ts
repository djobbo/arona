import { KnipConfig } from "knip"

const config: KnipConfig = {
  workspaces: {
    "examples/*": {
      entry: ["./index.(j|t)sx?", "./src/index.(j|t)sx?", "./arona.config.(j|t)s"],
      project: ["**/*.(j|t)sx?"],
      ignore: ["dist"],
    },
    "packages/*": {
      entry: ["./bin/cli.js", "./src/index.ts"],
      project: ["**/*.(j|t)sx?"],
      ignore: ["dist"],
    },
    "packages/core": {
      entry: ["./bin/cli.js", "./src/cli/index.ts", "./src/index.ts"],
      project: ["**/*.(j|t)sx?"],
      ignore: ["dist"],
    },
    "packages/create-arona-app": {
      entry: ["./bin/create-arona-app.js", "./scripts/copy-templates.ts"],
      project: ["**/*.(j|t)sx?"],
      ignore: ["dist"],
    }
  }
}

export default config