import { SlashCommandBuilder as DJSSlashCommandBuilder } from "discord.js"

class SlashCommandBuilder<
  Options extends Record<string, unknown> = {},
> extends DJSSlashCommandBuilder {
  constructor() {
    super()
  }

  addStringOption(option: any) {
    return super.addStringOption(option) as SlashCommandBuilder<
      Options & { input: string }
    >
  }
}

export const command = new SlashCommandBuilder()
  .setName("ping")
  .setDescription("Replies with Pong!")
  .addStringOption((option) =>
    option
      .setName("input")
      .setDescription("The input to echo back")
      .setRequired(true),
  )

const json = command.toJSON()
