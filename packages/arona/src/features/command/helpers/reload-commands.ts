import { REST, Routes } from "discord.js"
import type { SlashCommandBuilder } from "discord.js"
import type { createSlashCommand } from "../create-slash-command"

export const reloadCommands = async ({
  token,
  clientId,
  devGuildId,
  commands,
}: {
  token: string
  clientId: string
  devGuildId?: string
  commands: (SlashCommandBuilder | ReturnType<typeof createSlashCommand>)[]
}) => {
  const rest = new REST().setToken(token)

  try {
    console.log(
      `⏳ Started refreshing ${commands.length} application (/) commands.`,
    )

    const data = await rest.put(
      devGuildId
        ? Routes.applicationGuildCommands(clientId, devGuildId)
        : Routes.applicationCommands(clientId),
      {
        body: commands.map((command) =>
          "command" in command ? command.command : command,
        ),
      },
    )

    console.log(
      `✅ Successfully reloaded ${data.length} application (/) commands.`,
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
}
