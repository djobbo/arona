import { App } from "./App"
import { GatewayIntentBits } from "discord.js"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createClient, createSlashCommand } from "reaccord"
import { config as loadEnv } from "dotenv"

loadEnv()

const { DISCORD_TOKEN, DISCORD_DEV_GUILD_ID, DISCORD_CLIENT_ID } = process.env

const client = createClient({
  token: DISCORD_TOKEN ?? "",
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})

const queryClient = new QueryClient()

const rickCmd = createSlashCommand("rick", "Rick and Morty characters info.")
  .stringParam("search", "Character name search")
  .render(
    ({ search }) => (
      <QueryClientProvider client={queryClient}>
        <App search={search} />
      </QueryClientProvider>
    ),
    {
      unmountAfter: 300,
      ephemeral: true,
    },
  )

client.registerCommand(rickCmd)

client.connect((client) =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
