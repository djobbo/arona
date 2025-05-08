import { AronaClient } from "./features/discord-client/client"
import { Events, GatewayIntentBits } from "discord.js"
import { SlashCommandBuilder } from "./features/command/command-builder"
import { createSlashCommand } from "./features/command/create-slash-command"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, (readyClient) => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

const c = new SlashCommandBuilder()
  .addTypedStringOption("bruh", (option) =>
    option.setDescription("The input to echo back").setRequired(true),
  )
  .addTypedStringOption("hi", (option) =>
    option.setDescription("The input to echo back").setRequired(true),
  )

const command = createSlashCommand("ping", {
  command: (command) =>
    command
      .setDescription("Replies with Pong!")
      .addTypedStringOption("input", (option) =>
        option.setDescription("The input to echo back").setRequired(true),
      )
      .addTypedUserOption("us", (option) =>
        option.setDescription("Goat").setRequired(true),
      ),
  loader: async (interaction) => {
    console.log("Interaction", interaction.params)
  },
  component: <>Hello World</>,
})

client.addCommands([command])
await client.login()

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("♻️ index.ts updated")
  })

  import.meta.hot.dispose(() => {
    console.log("🧹 index.ts dispose")
  })
}
