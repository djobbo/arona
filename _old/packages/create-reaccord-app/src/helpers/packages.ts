import { shell } from "./shell.js"
import path from "node:path"

export const detectPackageManager = () => {
  if (!process.env.npm_config_user_agent) return

  const specifier = process.env.npm_config_user_agent.split(" ")[0]
  const name = specifier.substring(0, specifier.lastIndexOf("/"))
  return name === "npminstall" ? "cnpm" : name
}

// Users might lack access to the global npm registry, this function
// checks the user's project type and will return the proper npm registry
let _registry: string
async function getRegistry(packageManager: string): Promise<string> {
  if (_registry) return _registry

  const fallback = "https://registry.npmjs.org"

  try {
    const { stdout } = await shell(packageManager, [
      "config",
      "get",
      "registry",
    ])
    _registry = stdout?.trim()?.replace(/\/$/, "") || fallback
    // Detect cases where the shell command returned a non-URL (e.g. a warning)
    if (!new URL(_registry).host) _registry = fallback
  } catch (e) {
    _registry = fallback
  }

  return _registry
}

const getPackageVersion = async (
  packageManager: string,
  packageName: string,
  fallback = "",
) => {
  let registry = await getRegistry(packageManager)
  const { version } = (await fetch(`${registry}/${packageName}/latest`, {
    redirect: "follow",
  })
    .then((res) => res.json())
    // .then((data) => versionSchema.parse(data))
    .catch(() => ({ version: fallback }))) as { version: string }
  return version
}

export const getReaccordVersion = async (
  packageManager: string,
  fallback = "",
) => {
  try {
    const reaccordVersion = JSON.parse(
      path.join(require.resolve("create-reaccord-app"), "package.json"),
    ).version

    return reaccordVersion
  } catch (e) {
    return getPackageVersion(packageManager, "create-reaccord-app", fallback)
  }
}
