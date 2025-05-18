import { AronaClient } from "@arona/core"
import { Events, GatewayIntentBits } from "discord.js"
import { rickAndMortySearch } from "./commands/rick-and-morty"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

client.addCommands([rickAndMortySearch])
await client.login()
