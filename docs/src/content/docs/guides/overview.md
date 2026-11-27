---
title: Overview
description: An introduction to Arona.
---

Arona bridges Discord and Slack bots with [`@effect/ui`](https://ui.effect.website/), so you can build interactive messages as composable, testable components.

Arona provides host implementations and vocabularies for Effect UI targeting Discord (Components V2) and Slack (Block Kit), plus typed slash commands, interaction routing, modals, selects, and message lifecycle management.

## Motivation

Discord bots need to re-render a message whenever a button or select changes. Arona turns that into a normal Effect UI mount: the Model changes, the view re-renders, and the host edits the message. There is no React runtime, no hooks, and no JSX compiler step.

- **Elm-style components**: a component defines its props, Model, messages, and a pure `update`, then renders markup with a typed `h`.
- **Typed end to end**: Discord.js types flow through the vocabulary, command options, and interaction payloads.
- **Effect services**: queries, API calls, and side effects are Effects you can provide and test with Layers.
- **Host agnostic core**: `@arona/discord` implements a custom `@effect/ui` host, so the same component patterns can target another chat platform.

## Show me the code!

Here's a simple bot that responds to the `/counter` command with an interactive counter:

```ts
import { UiSchema } from "@effect/ui";
import {
  ActionRow,
  AronaDiscordClient,
  Button,
  Container,
  createSlashCommand,
  Text,
} from "@arona/discord";
import * as Discord from "@arona/discord";
import { Events, GatewayIntentBits } from "discord.js";
import { Schema } from "effect";

const CounterMessage = UiSchema.TaggedEnum({ ClickedIncrement: {} });

const Counter = Discord.component({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: {
    ClickedIncrement: ($) => $.evolve({ count: (count) => count + 1 }),
  },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Step: \`${model.count}\``),
        ActionRow(h, {
          children: [
            Button(h, {
              onClick: CounterMessage.ClickedIncrement(),
              children: ["+"],
            }),
          ],
        }),
      ],
    }),
});

const client = new AronaDiscordClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
});

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`);
});

const counter = createSlashCommand("counter", {
  command: (command) => command.setDescription("Counting example command"),
  component: Counter,
});

client.addCommands([counter]);
await client.login();
```

## How it works

Each platform package registers a custom `@effect/ui` host. The host stores the rendered tree as plain data, serializes it into the platform's payloads (Discord Components V2 or Slack Block Kit), and routes each interaction back to the element that generated its id. When a view handler sends a message, Effect UI updates the Model and re-renders only the affected component.

The renderer, message lifecycle, and node tree live in `@arona/core`; `@arona/discord` and `@arona/slack` provide only their platform host, target, vocabulary, and components. See [`packages/slack/README.md`](https://github.com/djobbo/arona/blob/master/packages/slack/README.md) for Slack's explicit `Blocks`/`Section`/`Actions` composition rules.

## Loading data with queries

Command params are passed to the command component as props. Data loading uses Effect UI `Query` services, not Promise loaders:

```ts
class SearchCharacters extends Query.Service<SearchCharacters>()("example/SearchCharacters", {
  args: { query: Schema.String },
  success: Schema.Array(Character),
  error: Schema.Never,
  staleTime: "5 minutes",
}) {
  static readonly layer = this.toLayer(
    Effect.gen(function* () {
      const http = yield* HttpClient.HttpClient;
      return ({ query }) => http.get(`/characters?name=${query}`).pipe(/* decode */);
    }),
  );
}

const App = Discord.component({
  name: "Search",
  props: Schema.Struct({ query: Schema.String }),
  model: Schema.Struct({ selected: Schema.String }),
  message: Message,
  queries: {
    characters: {
      query: SearchCharacters,
      args: ({ props }) => ({ query: props.query }),
    },
  },
}).make({
  init: () => ({ selected: "" }),
  update: {/* ... */},
  view: (h, model) =>
    AsyncResult.match(h.queries.characters, {
      onInitial: () => Text(h, "Loading..."),
      onFailure: () => Text(h, "Could not load characters."),
      onSuccess: ({ value: characters }) => Text(h, `${characters.length} characters`),
    }),
});

createSlashCommand("search", {
  command: (command) => command.setDescription("Search"),
  component: App,
  layer: SearchCharacters.layer.pipe(Layer.provide(FetchHttpClient.layer)),
});
```

There is no Promise `loader` option. Query state lives beside the component Model, so a result re-renders the message without an extra command.

Effect UI's built-in SSR is HTML-oriented (`HtmlServer` renders a document). A Discord message is a live interaction surface, so Arona keeps `Renderer.mount` and uses queries for data instead.

## Headless components and parts

Markup-only components (`Container`, `Text`, `Section`, `Button`, and friends) are plain view helpers: they return an element builder so they can be used inline, including as a section accessory.

Select menus come in all Discord variants: `Select`/`Option` for strings, `UserSelect`, `RoleSelect`, `MentionableSelect`, and `ChannelSelect` (with `channelTypes` and default values).

Arona does not insert structural components for you. Use `Fragment` when a view needs several top-level components, such as a section plus action rows. Buttons and selects must be placed in an `ActionRow`; media and canvas items must be placed in a `Gallery`; and modal fields must be placed in a `Label`. Top-level `Button`, `Select`, `Media`, `Canvas`, or a modal field throws a descriptive error instead of being wrapped implicitly.

Components that own behavior are headless `@effect/ui` components. `Select` and `Modal` define a Model, a message type, and a `parts` record. The caller draws those parts:

```ts
ActionRow(h, {
  children: [
    Select(h, {
      placeholder: "Pick a character",
      onChange: (interaction) => AppMessage.ChangedSelection({ id: interaction.values[0] ?? "" }),
      children: characters.map((character) =>
        Option(h, { value: String(character.id), label: character.name }),
      ),
    }),
  ],
});
```

This is the same pattern `@effect/ui` uses for its own kit: the component owns ids, defaults, validation, and interaction behavior; the consumer owns layout, labels, and the messages that leave the component.

### Modal fields

Discord's current modal API puts fields inside labels. Arona requires an explicit `Label`; it does not add one for you:

```ts
Modal(h, {
  title: "Profile",
  onSubmit: (payload) =>
    Submitted({
      name: payload.values.name ?? "",
      newsletter: payload.checkboxes.newsletter ?? false,
      plan: payload.radioGroups.plan ?? "",
    }),
  children: [
    Label(h, {
      label: "Name",
      description: "Your display name",
      children: [TextInput(h, { name: "name" })],
    }),
    Label(h, {
      label: "Newsletter",
      children: [Checkbox(h, { name: "newsletter" })],
    }),
    Label(h, {
      label: "Plan",
      children: [
        RadioGroup(h, {
          name: "plan",
          children: [
            RadioOption(h, { value: "free", label: "Free" }),
            RadioOption(h, { value: "pro", label: "Pro" }),
          ],
        }),
      ],
    }),
    Label(h, {
      label: "Attachments",
      children: [FileUpload(h, { name: "files", fileTypes: ["image"] })],
    }),
  ],
});
```

`onSubmit` receives text values, select and checkbox-group selections, checkbox values, radio values, mentionable selections, and uploaded files, each keyed by the field's `name`.

## Message lifecycle and layers

`mountMessage` returns a `DiscordMessageRoot` alongside the Discord message. Release it explicitly:

```ts
const { message, root } = await mountMessage(interaction, App, props);

// Later
await Effect.runPromise(root.close()); // idempotent
// or, outside Effect:
await root.unmount();
```

`close` clears `unmountAfter`, removes the root from the client, closes the message target, and interrupts the renderer fiber, which releases the query cache and every Layer built for that message. `renderMessage` is the convenience wrapper when you only need the message and let the client own the root lifetime.

In Effect code, prefer the scoped form so the message cannot outlive its owner:

```ts
yield *
  Effect.scoped(
    Effect.gen(function* () {
      const { message } = yield* mountMessageScoped(interaction, App, props);
      // ... use message
    }),
  );
```

The Discord renderer is assembled from semantic Layers:

- `MessageTarget.layer(ref, options)` — the message target service
- `DiscordHost.layer(options)` / `DiscordHost.layerFor(host)` — the Discord `Host` and `Renderer` services
- the command's `layer` — Query, Command, and other application services

## Observability

Arona ships an OTLP telemetry runtime built on Effect's `effect/observability`
exporters. Clients install it from the environment automatically:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
```

For local debugging without a collector, print finished spans to the console:

```bash
ARONA_TELEMETRY_CONSOLE=true pnpm dev
```

Console spans are indented and include duration and attributes. They replace
the OTLP trace exporter; metrics and logs still use a configured endpoint.

Traces cover message mounts, sends and edits, close, interactions, slash
commands, Slack events, and command reloads. Matching counters and duration
histograms are recorded under the `arona.*` namespace. For an explicit runtime,
install it before creating a client:

```ts
import { Telemetry } from "@arona/core";

Telemetry.install(
  Telemetry.create({
    endpoint: "http://localhost:4318",
    serviceName: "my-bot",
  }),
);
```

Use `Telemetry.withSpan` inside your own Effects and `Telemetry.current().span`
around Promise APIs. `Telemetry.flush()` exports buffered traces, logs, and
metrics; `Telemetry.shutdown()` also disposes the runtime.

## Testing

`@arona/discord/testing` exports a `FakeChannel`, payload finders, and interaction fakes. Tests can mount a component, assert the serialized payload, and dispatch a fake interaction without a Discord connection.

## Development

Arona uses [Vite+](https://viteplus.dev) with pnpm:

```bash
pnpm install
pnpm build
pnpm test
pnpm check
```
