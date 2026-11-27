import child from "node:child_process";
import path from "node:path";
import { build as viteBuild } from "vite";
import { createAronaViteConfig } from "./config";

export interface DevOptions {
  /** Arguments forwarded to the bot process. */
  readonly argv?: ReadonlyArray<string>;
  /** Output directory. Defaults to `<cwd>/node_modules/.arona`. */
  readonly outDir?: string;
  /** Called after each rebuild, primarily for tests. */
  readonly onRestart?: (outputFile: string) => void;
}

/**
 * Starts the file watcher and keeps a bot process running against the latest
 * build. Effect UI owns rendering, so there is no framework hot reload to
 * preserve: a rebuild restarts the process.
 */
export const dev = async (
  entry: string,
  { argv = [], outDir, onRestart }: DevOptions = {},
): Promise<child.ChildProcess | null> => {
  const outputDir = outDir ?? path.resolve(process.cwd(), "node_modules", ".arona");
  const outputFile = path.join(outputDir, "index.js");

  let botProcess: child.ChildProcess | null = null;
  let built = false;

  const stop = async (): Promise<void> => {
    const previous = botProcess;
    botProcess = null;
    if (!previous || previous.exitCode !== null || previous.signalCode !== null) return;

    await new Promise<void>((resolve) => {
      let settled = false;
      let timer: ReturnType<typeof setTimeout>;
      const done = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        previous.kill("SIGKILL");
        done();
      }, 2_000);
      previous.once("exit", done);
      previous.kill("SIGTERM");
    });
  };

  let restartQueue: Promise<void> = Promise.resolve();
  let restartGeneration = 0;

  const restart = (): Promise<void> => {
    // Never overlap bot instances: two gateways for one token would both
    // receive interactions, and the second reply fails with Unknown interaction.
    const generation = ++restartGeneration;
    const next = restartQueue.then(async () => {
      // A newer build superseded this one while it was queued.
      if (generation !== restartGeneration) return;

      await stop();
      if (generation !== restartGeneration) return;

      botProcess = child.fork(outputFile, [...argv], {
        env: { ...process.env, NODE_ENV: "development" },
        stdio: "inherit",
      });
      onRestart?.(outputFile);
    });
    restartQueue = next.catch(() => {});
    return next;
  };

  const config = createAronaViteConfig({
    entry,
    mode: "development",
    outDir: outputDir,
    watch: true,
  });
  config.plugins = [
    {
      name: "arona-restart-bot",
      async closeBundle() {
        await restart();
        built = true;
      },
    },
  ];

  const watcher = await viteBuild(config);
  const cleanup = () => {
    botProcess?.kill("SIGKILL");
    botProcess = null;
    if (typeof watcher === "object" && "close" in watcher) {
      void watcher.close();
    }
    process.exit(0);
  };
  process.once("SIGINT", cleanup);
  process.once("SIGTERM", cleanup);

  if (!built) {
    console.log("⚙️ Watching for changes...");
  }

  return botProcess;
};
