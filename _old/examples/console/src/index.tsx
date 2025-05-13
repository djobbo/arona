import { App } from "./App"
import { GatewayIntentBits } from "discord.js"
import { createClient, createSlashCommand } from "reaccord"
import { config as loadEnv } from "dotenv"

loadEnv()

const {
  DISCORD_TOKEN = "",
  DISCORD_DEV_GUILD_ID,
  DISCORD_CLIENT_ID,
} = process.env

const consoleCommand = //
  createSlashCommand("console", "Console emulator") //
    .render(() => <App />)

const client = createClient({
  token: DISCORD_TOKEN,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
  commands: [consoleCommand],
})

client.connect(() =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
