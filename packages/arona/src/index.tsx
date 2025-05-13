import { AronaClient } from "./features/discord-client/client"
import { Events, GatewayIntentBits } from "discord.js"
import { createSlashCommand } from "./features/command/create-slash-command"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

const Component = (): JSX.Element => {
  const {
    loaderData,
    interaction: {
      params: { msg, target },
    },
  } = command.useCommandContext()

  return (
    <>
      {loaderData.name}
      Sending {msg} to {target.displayName}
    </>
  )
}

const command = createSlashCommand("ping", {
  command: (command) =>
    command
      .setDescription("Replies with Pong!")
      .addTypedStringOption((option) =>
        option
          .setName("msg")
          .setDescription("The input to echo back")
          .setRequired(true),
      )
      .addTypedUserOption((option) =>
        option.setName("target").setDescription("Goat").setRequired(true),
      ),
  loader: async (interaction) => {
    console.log("Interaction", interaction.params)
    return {
      name: "Hello",
    }
  },
  component: Component,
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
