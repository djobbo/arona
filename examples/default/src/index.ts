import { AronaClient } from "@arona/core"
import { Events, GatewayIntentBits } from "discord.js"
import { counter } from "./commands/counter"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

client.addCommands([counter])
await client.login()
