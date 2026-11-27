#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const PLACEHOLDER_VERSIONS = new Set(["0.0.0-dev", "workspace:0.0.0-dev", "workspace:*"]);

const [, , packageName, packageFolder, ...args] = process.argv;

if (!packageName || !packageFolder) {
  console.error("Usage: vpx scripts/publish-dev.ts <package-name> <folder> [--dry-run]");
  process.exit(1);
}

const dryRun = args.includes("--dry-run");
const rootPackage = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};
const packageJsonPath = join(packageFolder, "package.json");
const originalPackageJson = readFileSync(packageJsonPath, "utf8");

const run = (
  command: string,
  commandArgs: ReadonlyArray<string>,
  options: { capture?: boolean; cwd?: string } = {},
) =>
  execFileSync(command, commandArgs, {
    cwd: options.cwd ?? process.cwd(),
    encoding: "utf8",
    stdio: options.capture ? ["ignore", "pipe", "ignore"] : "inherit",
  }).trim();

const gitHash = run("git", ["rev-parse", "--short", "HEAD"], { capture: true });
const devVersion = `${rootPackage.version}-dev.${gitHash}`;

let previousDevVersion: string | null = null;
try {
  previousDevVersion = run("npm", ["view", `${packageName}@dev`, "version"], {
    capture: true,
  });
} catch {
  // The package has no dev tag yet.
}

if (previousDevVersion?.split(".").at(-1) === gitHash) {
  console.log(`No new version for ${packageName}; skipping ${devVersion}.`);
  process.exit(0);
}

const rewriteDependencies = (dependencies: Record<string, string> | undefined) => {
  if (!dependencies) return undefined;
  return Object.fromEntries(
    Object.entries(dependencies).map(([name, version]) => [
      name,
      PLACEHOLDER_VERSIONS.has(version) ? devVersion : version,
    ]),
  );
};

const restore = () => {
  writeFileSync(packageJsonPath, originalPackageJson);
};

try {
  console.log(`🔨 Building ${packageName}@${devVersion}`);
  run("pnpm", ["install", "--frozen-lockfile"]);
  run("pnpm", ["--filter", packageName, "build"]);

  if (!dryRun) {
    const packageJson = JSON.parse(originalPackageJson) as {
      version: string;
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    packageJson.version = devVersion;
    packageJson.dependencies = rewriteDependencies(packageJson.dependencies);
    packageJson.devDependencies = rewriteDependencies(packageJson.devDependencies);
    writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, "\t")}\n`);
  }

  console.log(
    dryRun
      ? `🧪 Dry run: would publish ${packageName}@${devVersion}`
      : `🚀 Publishing ${packageName}@${devVersion}`,
  );
  run(
    "npm",
    dryRun
      ? ["publish", "--dry-run", "--tag", "dev", "--access", "public"]
      : ["publish", "--tag", "dev", "--access", "public"],
    { cwd: packageFolder },
  );
  console.log(`✅ ${packageName}@${devVersion} published`);
} finally {
  restore();
}
