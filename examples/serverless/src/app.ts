import { layerFile, MessageSessionStore } from "@arona/core";
import { AronaDiscordClient, createInteractionsHandler } from "@arona/discord";
import { Effect } from "effect";
import { counter } from "./commands/counter.ts";

const token = process.env.DISCORD_APP_TOKEN;
const clientId = process.env.DISCORD_APP_ID;
const publicKey = process.env.DISCORD_PUBLIC_KEY;

if (token === undefined || clientId === undefined || publicKey === undefined) {
  throw new Error(
    "Set DISCORD_APP_TOKEN, DISCORD_APP_ID, and DISCORD_PUBLIC_KEY before starting the serverless example.",
  );
}

// Local demo only. A real serverless deployment needs a shared durable store.
const sessions = await Effect.runPromise(
  Effect.gen(function* () {
    return yield* MessageSessionStore;
  }).pipe(Effect.provide(layerFile(process.env.ARONA_SESSION_DIR ?? "./.arona/sessions"))),
);

export const client = new AronaDiscordClient({
  token,
  clientId,
  intents: [],
  sessions,
  build: process.env.BUILD_ID ?? "dev",
}).addCommands([counter]);

/**
 * The Fetch handler to export from a Vercel/Cloudflare/Node route.
 *
 * Inline mode keeps modals working. Set `defer: true` and a `background` hook
 * when the work may exceed Discord's three-second acknowledgement deadline.
 */
export const handler = createInteractionsHandler({
  client,
  publicKey,
  token,
});
