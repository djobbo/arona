---
title: Resumable messages
description: Persist Effect UI state so a message survives a process restart or a serverless invocation.
---

A normal Arona message keeps its component models inside the running renderer
fiber. When the process exits, the buttons still exist on Discord, but nothing
can interpret them. A resumable message moves the source of truth into a
`MessageSessionStore` and puts enough routing context into every `custom_id` to
find it again.

## What is stored

```ts
interface MessageSession {
  id: string; // primary key, embedded in custom ids
  version: number; // the state version the message currently shows
  status: "pending" | "active" | "closed";
  component: string; // client registry key
  build: string; // application fingerprint, "" disables the check
  props: unknown; // caller-encoded props
  state: Renderer.State; // Root.snapshot() from @effect/ui
  message?: { id: string; channelId?: string; guildId?: string };
  ephemeral: boolean;
  createdAt: number;
  updatedAt: number;
  expiresAt?: number;
  lastInteractionId?: string;
}
```

`state` is the same encoded model tree `Renderer.prerender` produces. Instances
whose model holds `Schema.Redacted`, and instances whose Layer was kept off the
renderer, are deferred and start from `init` again.

The store is a Layer:

```ts
import { MessageSessionStore, layerFile, layerMemory } from "@arona/core";
import { Effect } from "effect";

// Tests and a single gateway process.
const memory = layerMemory;

// Local development, one writer process.
const files = layerFile("./.arona/sessions");
```

Every implementation provides `create`, `get`, `update` (version CAS),
`setState`, `attachMessage`, `findByMessage`, `close`, `sweep`, and
`listActive`. A durable adapter such as Postgres, Redis, D1, or DynamoDB only
needs those operations; `update` is the concurrency primitive.

## Mounting a session

```ts
import { mountSessionMessage } from "@arona/discord";
import { Effect } from "effect";

const sessions = await Effect.runPromise(
  Effect.gen(function* () {
    return yield* MessageSessionStore;
  }).pipe(Effect.provide(layerFile("./.arona/sessions"))),
);

const { root, session } = await mountSessionMessage(
  interaction,
  Counter,
  {},
  {
    store: sessions,
    componentKey: "counter",
    sessionProps: {}, // must be serialisable for a durable store
  },
);

// Later, after a restart, pass the loaded record and the existing message:
await mountSessionMessage(
  interaction,
  Counter,
  {},
  {
    store: sessions,
    componentKey: "counter",
    session,
    resume: interaction.message,
    skipInitial: true,
  },
);
```

The first mount sends the message and stores its initial state at version `0`.
Each handled interaction snapshots the tree, stores the next state with a CAS
update, and edits the message. A resumed mount does not call `init` for
instances whose state ships.

## Client setup

```ts
const client = new AronaDiscordClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  intents: [],
  sessions,
  build: process.env.BUILD_ID,
}).registerComponent("counter", Counter);
```

With a store on the client:

- slash commands built with `createSlashCommand` use `mountSessionMessage`;
  their stored props are `{ params }`, and the current interaction is restored
  through the component's `decodeProps` hook;
- a component interaction with an Arona `custom_id` is routed by session, not
  by scanning in-memory roots;
- if no warm root exists, the client loads the record and mounts a resumed root
  against `interaction.message`;
- a stale `version` heals the message from stored state and drops the click.

`registerComponent(key, component, { decodeProps })` is how a cold process
turns stored props back into live props. The default passes stored props
through unchanged.

Commands registered with `client.addCommands(...)` also register their
component and `decodeProps` hook at startup. That matters after a restart: the
button click arrives before the command handler ever runs, and the client still
has to know which component and command params to mount.

## Custom ids

With a session bound, auto ids are document-order ordinals and explicit ids
keep the author's text as the key. Both are wrapped:

```text
ar1.<sessionId>.<versionBase36>.<key>
```

`key` is `a0`, `a1`, … for auto ids and the author's `customId` otherwise. The
envelope stays under Discord's 100-character limit; a longer explicit id fails
at commit.

The ordinal is assigned at commit time, not node creation time. A restored tree
that reaches the same final model therefore produces the same ids, even if the
original process built it incrementally. If an interactive node moves or
leaves, the next edit carries the recomputed ids.

## Restarts and serverless

On the gateway, the warm root map is only a cache. After a restart, the first
interaction for a session loads the record and resumes lazily. Self-updating
messages (queries, subscriptions, `unmountAfter`) do not run while the process
is down; resume them eagerly with `listActive` if that matters.

## HTTP interactions

`createInteractionsHandler` is a Fetch API handler for Discord's Interactions
Endpoint URL. It verifies the Ed25519 signature, answers `PING`, and feeds the
same `AronaDiscordClient` and session store:

```ts
import { createInteractionsHandler } from "@arona/discord";

const handler = createInteractionsHandler({
  client,
  publicKey: process.env.DISCORD_PUBLIC_KEY!,
  token: process.env.DISCORD_APP_TOKEN!,
  // Inline: process before responding, so a modal can be the answer.
  // Finish within Discord's three-second deadline.
  defer: false,
});
```

Point the platform route at `handler` and pass the `Request`. The default
verifier uses Node's `crypto`; pass `verify` to plug in WebCrypto for a
different runtime. Two modes:

- `defer: false` (default) processes before responding. The first message
  update or modal becomes the interaction response, so dialogs work. The whole
  path must finish within three seconds; use a warm store and a warm runtime.
- `defer: true` returns `type 5`/`type 6` immediately and continues through
  REST. Use the platform's `background` hook (`ctx.waitUntil`, `waitUntil`,
  SQS, …). Modals cannot be opened after an acknowledgement, so keep
  modal-opening interactions on the inline path.

Raw JSON messages, channel edits, and interaction-token edits are handled by
the bundled `DiscordRest` client. Message file uploads over HTTP are not
supported yet.

Keep these constraints in mind:

- gateway and HTTP interactions are mutually exclusive per application;
- HTTP gives you commands, buttons, selects, modals, and autocomplete, not
  `MESSAGE_CREATE`;
- an interaction is not retried, so persist the session before acknowledging;
- the token for `@original` lasts 15 minutes, while bot-token channel edits can
  continue after that for non-ephemeral messages;
- a modal that was itself the initial response to a command has no platform
  message yet, so message-session resume cannot recover it on submit.

## Limits

- State is decoded with the component schemas. A different build must not
  resume it; set `build` and treat a mismatch as expired.
- Props must be JSON-serialisable when the store is durable.
- The file store checks CAS before writing but is not a multi-writer
  transaction. Use a database when several processes share state.
- The HTTP adapter mounts a fresh root per request and releases session roots
  afterwards. It assumes one in-flight interaction per process; the store CAS
  prevents corruption, but add a per-session lease for concurrent handlers.
- `layerMemory` loses sessions on a cold start. Behind HTTP, use a shared
  durable store.
- HTTP message file uploads are not supported yet.
- The snapshot/resume API is currently a `pnpm patch` of `@effect/ui`
  (`Root.snapshot` and `mount({ state })`). Rebase the patch when upgrading.
