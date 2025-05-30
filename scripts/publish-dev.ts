#!/usr/bin/env bun

import { $ } from "bun"
import { version } from "../package.json"
import chalk from "chalk"
import stripAnsi from "strip-ansi"

const PLACEHOLDER_VERSION = "0.0.0-dev"
const MAX_RETRIES = 3
const RETRY_DELAY = 2000 // 2 seconds

const logInfo = (...args: string[]) =>
  console.log(chalk.gray("[Info]"), ...args)
const logSuccess = (...args: string[]) =>
  console.log(chalk.green("[Success]"), ...args)
const logError = (...args: string[]) =>
  console.log(chalk.red("[Error]"), ...args)
const logWarning = (...args: string[]) =>
  console.log(chalk.yellow("[Warning]"), ...args)
const logDebug = (...args: string[]) =>
  process.env.DEBUG && console.log(chalk.blue("[Debug]"), ...args)
const logBoxed = (msg: string) => {
  const len = stripAnsi(msg).length + 2
  console.log("╭" + "─".repeat(len) + "╮")
  console.log("│ " + msg + " │")
  console.log("╰" + "─".repeat(len) + "╯")
}
const newLine = () => console.log()

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const updateLocalDeps = (deps: Record<string, string>, newVersion: string) =>
  Object.fromEntries(
    Object.entries(deps || {}).map(([dep, ver]) => [
      dep,
      [
        PLACEHOLDER_VERSION,
        `workspace:${PLACEHOLDER_VERSION}`,
        `workspace:*`,
      ].includes(typeof ver === "string" ? ver : "")
        ? newVersion
        : ver,
    ]),
  )

const validateVersion = (version: string) => {
  const semverRegex = /^\d+\.\d+\.\d+(-dev\.\w+)?$/
  if (!semverRegex.test(version)) {
    throw new Error(`Invalid version format: ${version}`)
  }
}

const retryOperation = async <T>(
  operation: () => Promise<T>,
  operationName: string,
  maxRetries = MAX_RETRIES
): Promise<T> => {
  let lastError: Error | null = null
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error as Error
      logWarning(
        `${operationName} failed (attempt ${i + 1}/${maxRetries}): ${
          error instanceof Error ? error.message : String(error)
        }`
      )
      if (i < maxRetries - 1) {
        logInfo(`Retrying in ${RETRY_DELAY / 1000} seconds...`)
        await sleep(RETRY_DELAY)
      }
    }
  }
  throw lastError
}

const [, , packageName, packageFolder, ...args] = process.argv

if (!packageName) {
  logError("Missing package name")
  process.exit(1)
}

if (!packageFolder) {
  logError("Missing package folder")
  process.exit(1)
}

const dryRun = args.includes("--dry-run")
const debug = args.includes("--debug")
if (debug) process.env.DEBUG = "true"

let originalPackageJson: any = null
let gitShortHash: string | null = null
let newDevVersion: string | null = null

const cleanup = async () => {
  if (originalPackageJson && packageFolder) {
    logInfo("Restoring original package.json...")
    try {
      await Bun.write(
        `${packageFolder}/package.json`,
        JSON.stringify(originalPackageJson, null, 2)
      )
      logSuccess("Restored original package.json")
    } catch (error) {
      logError("Failed to restore original package.json:", error)
    }
  }
}

process.on("SIGINT", async () => {
  logWarning("Process interrupted, cleaning up...")
  await cleanup()
  process.exit(1)
})

process.on("uncaughtException", async (error) => {
  logError("Uncaught exception:", error instanceof Error ? error.message : String(error))
  await cleanup()
  process.exit(1)
})

// Main execution
try {
  logBoxed(`Publishing ${packageName} ${chalk.green(`v${version}-dev`)}`)

  // Get git hash
  try {
    gitShortHash = (await $`git rev-parse --short HEAD`.text()).trim()
    logDebug(`Git short hash: ${gitShortHash}`)
  } catch (error) {
    throw new Error(`Failed to get git short hash: ${error}`)
  }

  if (!gitShortHash) {
    throw new Error("Failed to get git short hash")
  }

  // Check previous version
  logInfo(`Checking latest dev version of ${chalk.blue(packageName)}...`)
  let previousDevVersion: string | null = null

  try {
    previousDevVersion = (
      await retryOperation(
        () => $`npm view ${packageName}@dev version`.text(),
        "npm view"
      )
    ).trim()
  } catch {}

  if (previousDevVersion) {
    logInfo(
      `Latest dev version of ${chalk.blue(packageName)} is ${chalk.green(
        previousDevVersion
      )}`
    )

    const latestDevVersionHash = previousDevVersion.split(".").at(-1)
    if (latestDevVersionHash === gitShortHash) {
      logWarning(`No new version found, skipping publish.`)
      process.exit(0)
    }
  }

  const timestamp = Date.now()
  newDevVersion = `${version}-dev.${gitShortHash}`
  validateVersion(newDevVersion)

  newLine()
  logBoxed(
    `Publishing New ${packageName}@dev version: ${chalk.green(
      `v${newDevVersion}`
    )}`
  )

  // Install dependencies
  logInfo("Installing dependencies...")
  await retryOperation(
    () => $`bun i --frozen-lockfile`,
    "bun install"
  )
  logSuccess("Dependencies installed.")
  newLine()

  logBoxed(`Publishing ${chalk.blue(packageName)}`)

  // Deprecate old version
  if (previousDevVersion) {
    logInfo(
      `Existing dev version found, deprecating old dev version ${chalk.yellow(
        previousDevVersion
      )}...`
    )
    try {
      if (!dryRun) {
        await retryOperation(
          () =>
            $`npm deprecate ${packageName}@${previousDevVersion} "no longer supported"`,
          "npm deprecate"
        )
        logSuccess(
          `Successfully deprecated ${chalk.yellow(
            `${packageName}@${previousDevVersion}`
          )}`
        )
      }
    } catch (error) {
      logWarning(
        `Failed to deprecate ${chalk.yellow(
          `${packageName}@${previousDevVersion}`
        )}: ${error}`
      )
    }
  }
  newLine()

  // Update package version
  logInfo(
    `Updating ${chalk.blue(packageName)} version to ${chalk.green(
      `v${newDevVersion}`
    )}`
  )

  const packageJsonPath = `${packageFolder}/package.json`

  // Build package
  logInfo(`Building ${chalk.blue(packageName)}...`)
  await retryOperation(
    () => $`bunx turbo run build --filter=${packageName}`,
    "build"
  )
  logSuccess(`Built ${chalk.blue(packageName)}`)
  newLine()

  if (!dryRun) {
    // Backup original package.json
    originalPackageJson = await Bun.file(packageJsonPath).json()
    
    const packageJson = { ...originalPackageJson }
    packageJson.version = newDevVersion

    packageJson.dependencies = updateLocalDeps(
      packageJson.dependencies,
      newDevVersion
    )
    packageJson.devDependencies = updateLocalDeps(
      packageJson.devDependencies,
      newDevVersion
    )

    await Bun.write(packageJsonPath, JSON.stringify(packageJson, null, 2))
  } else {
    logInfo(`Dry run: Would have updated version to ${newDevVersion}`)
  }

  logSuccess(
    `Updated ${chalk.blue(packageName)} version to ${chalk.green(
      `v${newDevVersion}`
    )}`
  )

  // Publish package
  logInfo(`Publishing ${chalk.blue(packageName)} to NPM...`)
  try {
    if (!dryRun) {
      await retryOperation(
        () =>
          $`cd ${packageFolder} && npm publish --no-git-checks --tag dev --access public`,
        "npm publish"
      )
    } else {
      await retryOperation(
        () =>
          $`cd ${packageFolder} && npm publish --dry-run --no-git-checks --tag dev --access public`,
        "npm publish"
      )
      logInfo(`Dry run: Would have published ${packageName}@${newDevVersion}`)
    }

    logSuccess(`Published ${chalk.green(`${packageName}@${newDevVersion}`)}`)
    logInfo(
      `View package at ${chalk.gray(
        `https://npmjs.com/package/${packageName}`
      )}`
    )
  } catch (error) {
    throw new Error(
      `Failed to publish ${chalk.yellow(
        `${packageName}@${newDevVersion}`
      )}: ${error}`
    )
  }
  newLine()

  logBoxed(`Successfully published Arona ${chalk.green(`v${newDevVersion}`)}`)
} catch (error) {
  logError(error instanceof Error ? error.message : String(error))
  await cleanup()
  process.exit(1)
}
