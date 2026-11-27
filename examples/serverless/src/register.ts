import { commandSummaries, reloadCommands } from "@arona/discord";
import { counter } from "./commands/counter.ts";

const token = process.env.DISCORD_APP_TOKEN;
const clientId = process.env.DISCORD_APP_ID;
const devGuildId = process.env.DISCORD_DEV_GUILD_ID;

if (token === undefined || clientId === undefined) {
  throw new Error("Set DISCORD_APP_TOKEN and DISCORD_APP_ID before registering commands.");
}

console.log(`Registering ${commandSummaries([counter]).join(", ")}`);

await reloadCommands({
  token,
  clientId,
  ...(devGuildId === undefined ? {} : { devGuildId }),
  commands: [counter],
});
