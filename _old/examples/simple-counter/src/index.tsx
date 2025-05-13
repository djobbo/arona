import { Counter } from "./Counter"
import { GatewayIntentBits } from "discord.js"
import { createClient, createSlashCommand, renderMessage } from "reaccord"
import { config as loadEnv } from "dotenv"

loadEnv()

const {
  DISCORD_TOKEN = "",
  DISCORD_DEV_GUILD_ID,
  DISCORD_CLIENT_ID,
} = process.env

// Create gateway client
const client = createClient({
  token: DISCORD_TOKEN,
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})

// Create end-user command
const counterCommand = createSlashCommand("counter", "A simple counter")
  .intParam("start", "Number to start counting from")
  .render(({ start }) => <Counter start={start} />)

const dmCounterCommand = createSlashCommand("dm-counter", "A simple counter")
  .intParam("start", "Number to start counting from")
  .exec(async ({ start }, interaction) => {
    try {
      const dmChannel = await interaction.user.createDM()

      await renderMessage(() => <Counter start={start} />, client, dmChannel)
    } catch (err) {
      interaction.reply("I can't DM you!")
    }
  })

client.registerCommands([counterCommand, dmCounterCommand])

// Connect client to gateway
client.connect(() =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
