import { AronaDiscordClient, render, renderMessage, Text } from "@arona/discord"
import { Events, GatewayIntentBits } from "discord.js"
import { App } from './app'

const client = new AronaDiscordClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return

  const testMessage = await renderMessage(
    message,
    () => <App message={message} />,
  )
  

  if (!testMessage) return


  await renderMessage(testMessage, () => {
    return <Text>test</Text>
  })
})

await client.login()
