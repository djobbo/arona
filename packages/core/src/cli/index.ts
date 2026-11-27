import path from "node:path";
import dotenv from "dotenv";
import { build } from "./build";
import { dev } from "./dev";

export type CliCommand =
  | { readonly _tag: "Dev"; readonly entry: string }
  | { readonly _tag: "Build"; readonly entry: string }
  | { readonly _tag: "Help" }
  | { readonly _tag: "Error"; readonly message: string };

const usage = [
  "Usage: arona <command> [options]",
  "Commands:",
  "  dev <entry-point>    Start the development watcher.",
  "  build <entry-point>  Build the bot for production.",
].join("\n");

/**
 * Parses the CLI arguments without touching the process or filesystem, so the
 * behaviour can be unit tested.
 */
export const parseArgs = (argv: ReadonlyArray<string>): CliCommand => {
  const [, , command, entryPoint] = argv;

  switch (command) {
    case "dev":
    case "build": {
      if (!entryPoint) {
        return {
          _tag: "Error",
          message: `Please provide an entry point file path.\n\n${usage}`,
        };
      }
      const entry = path.resolve(process.cwd(), entryPoint);
      return command === "dev" ? { _tag: "Dev", entry } : { _tag: "Build", entry };
    }
    case undefined:
    case "help":
      return { _tag: "Help" };
    default:
      return { _tag: "Error", message: `Unknown command: ${command}\n\n${usage}` };
  }
};

export interface CliDependencies {
  readonly dev?: typeof dev;
  readonly build?: typeof build;
  readonly exit?: (code: number) => void;
  readonly log?: (...args: ReadonlyArray<unknown>) => void;
  readonly error?: (...args: ReadonlyArray<unknown>) => void;
}

/** Runs the CLI. Exported with injectable dependencies for tests. */
export const run = async (
  argv: ReadonlyArray<string> = process.argv,
  dependencies: CliDependencies = {},
): Promise<void> => {
  dotenv.config({ path: path.resolve(process.cwd(), ".env") });

  const command = parseArgs(argv);
  const log = dependencies.log ?? console.log;
  const error = dependencies.error ?? console.error;
  const exit = dependencies.exit ?? ((code: number) => process.exit(code));

  switch (command._tag) {
    case "Help":
      log(usage);
      return;
    case "Error":
      error(command.message);
      exit(1);
      return;
    case "Build":
      await (dependencies.build ?? build)(command.entry);
      return;
    case "Dev":
      await (dependencies.dev ?? dev)(command.entry);
      return;
  }
};
