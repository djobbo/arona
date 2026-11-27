# Serverless Discord example

A Discord application that receives slash commands and component interactions
over Discord's HTTP Interactions Endpoint URL, with resumable message state.
There is no gateway connection.

Build the packages first if you are running from a fresh checkout:

```sh
pnpm build
```

## Setup

```sh
export DISCORD_APP_TOKEN=...
export DISCORD_APP_ID=...
export DISCORD_PUBLIC_KEY=...
export DISCORD_DEV_GUILD_ID=...   # optional, for instant command registration

pnpm --filter @arona-ex/serverless register
pnpm --filter @arona-ex/serverless dev
```

Expose the local server (for example with a tunnel) and set its
`/interactions` URL as the application's Interactions Endpoint URL. Discord
verifies the endpoint with a signed `PING` before saving it.

Gateway and HTTP interactions are mutually exclusive per application. Turn off
the gateway client for this app.

## State

`src/app.ts` uses the JSON-file `MessageSessionStore` for a runnable local demo.
A real serverless deployment needs a shared durable store; file and memory
stores are lost across cold starts. Implement the same store contract over
Postgres, Redis, D1, or DynamoDB.

When `DISCORD_APP_ID` and `DISCORD_PUBLIC_KEY` are set, each interaction carries
the session id in its `custom_id`; the handler loads the stored state, resumes
the component tree, applies the click, persists the next state, and edits the
message.

## Slow work

The default adapter mode is inline: it returns the first message or modal as
the initial response, so dialogs work, but the whole path must finish within
Discord's three-second deadline.

For slower handlers, pass `defer: true` and a platform `background` hook:

```ts
createInteractionsHandler({
  client,
  publicKey,
  token,
  defer: true,
  background: (work) => ctx.waitUntil(work),
});
```

Deferred mode acknowledges with type `5`/`6` immediately and finishes through
REST. A modal cannot be the response after an acknowledgement, so keep
modal-opening interactions inline.
