import { Telemetry } from "@arona/core";
import { AronaDiscordClient, renderMessage } from "@arona/discord";
import { Events, GatewayIntentBits } from "discord.js";
import { App } from "./app";

if (process.env.NODE_ENV !== "production") {
  Telemetry.install(Telemetry.create({ console: true }));
}

const client = new AronaDiscordClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`);
});

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  await renderMessage(message, App, { message });
});

await client.login();
