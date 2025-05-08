import { ApplicationCommandOptionType } from "discord.js"
import type { ChatInputCommandInteraction, User } from "discord.js"
import type { SlashCommandBuilder } from "../command-builder"

export interface SlashCommandInteraction<Params = {}>
  extends ChatInputCommandInteraction {
  params: Params
}

export const getTypedInteraction = <Params = {}>(
  command: SlashCommandBuilder<Params>,
  interaction: ChatInputCommandInteraction,
): SlashCommandInteraction<Params> => {
  const params = command.params.reduce(
    (acc, { name, type }) => {
      let value = null
      switch (type) {
        case ApplicationCommandOptionType.String:
          value = interaction.options.getString(name)
          break
        case ApplicationCommandOptionType.Boolean:
          value = interaction.options.getBoolean(name)
          break
        case ApplicationCommandOptionType.User:
          value = interaction.options.getUser(name) as User
          break
        default:
          value = interaction.options.get(name)?.value
          break
      }
      acc[name] = value
      return acc
    },
    {} as Record<string, unknown>,
  )

  ;(interaction as SlashCommandInteraction).params = params
  return interaction as SlashCommandInteraction<Params>
}
