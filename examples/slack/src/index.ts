import { Telemetry } from "@arona/core";
import { AronaSlackClient, renderMessage } from "@arona/slack";
import { App } from "./app";

if (process.env.NODE_ENV !== "production") {
  Telemetry.install(Telemetry.create({ console: true }));
}

const client = new AronaSlackClient({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
  port: Number(process.env.SLACK_PORT) || 3000,
});

client.message(/hi/i, async ({ message }) => {
  await renderMessage(message, App, {});
});

await client.start();
