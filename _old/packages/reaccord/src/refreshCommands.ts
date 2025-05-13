import { REST } from "@discordjs/rest"
import { Routes } from "discord-api-types/v10"
import type { CommandBase } from "./Command"

const DEV = process.env.NODE_ENV !== "production"

export const refreshCommands = async (
  token: string,
  commands: CommandBase[],
  clientId?: string,
  devGuildId?: string,
) => {
  const rest = new REST({ version: "10" }).setToken(token)
  if (!clientId)
    throw new Error("Can't create slash command. No `clientId` was provided.")
  try {
    console.log("✨ Started refreshing application (/) commands.")

    const body = commands.map((c) => c.data)

    if (DEV) {
      if (!devGuildId)
        throw new Error(
          "Couldn't refresh slash commands in dev mode, `devServerId` option was not provided.",
        )
      await rest.put(Routes.applicationGuildCommands(clientId, devGuildId), {
        body,
      })
    } else {
      await rest.put(Routes.applicationCommands(clientId), {
        body,
      })
    }

    console.log("🙌 Successfully reloaded application (/) commands.")
  } catch (error) {
    console.error(error)
  }
}
