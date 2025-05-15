import { AronaClient } from "./features/discord-client/client"
import { Events, GatewayIntentBits } from "discord.js"
import { testCommand } from "./test-command"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

client.addCommands([testCommand])
await client.login()

// if (import.meta.hot) {
//   import.meta.hot.accept(() => {
//     console.log("♻️ index.ts updated")
//   })

//   import.meta.hot.dispose(() => {
//     console.log("🧹 index.ts dispose")
//   })
// }
