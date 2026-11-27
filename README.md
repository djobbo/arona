# Arona

Arona is a framework for building interactive chat bots with [Effect](https://github.com/Effect-TS/effect) and [`@effect/ui`](https://github.com/Effect-TS/ui). It ships custom Effect UI hosts for Discord and Slack, so message components are Schema-defined, purely updated, and serialized to each platform's native message format.

## 🚀 Quick Start

```bash
pnpm create arona-app my-bot
cd my-bot
pnpm install
pnpm dev
```

> `@effect/ui` is experimental and currently published from pkg.pr.new snapshots. The templates pin a snapshot until the packages reach npm.

## 📦 Packages

- `@arona/core` — the `arona` CLI (Vite+ powered), command registry, and shared message lifecycle
- `@arona/discord` — the Discord Effect UI host, vocabulary, components, and slash commands
- `@arona/slack` — the Slack Block Kit host, vocabulary, and components
- `create-arona-app` — the scaffolding CLI

## 💻 Usage

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

export const Counter = Discord.component({
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

client.addCommands([
  createSlashCommand("counter", {
    command: (command) => command.setDescription("Counting example command"),
    component: Counter,
  }),
]);

await client.login();
```

### Slack

```ts
import {
  Actions,
  AronaSlackClient,
  Blocks,
  Button,
  renderMessage,
  Section,
  Text,
} from "@arona/slack";
import { App } from "./app";

const client = new AronaSlackClient({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

client.message(/hi/i, async ({ message }) => {
  await renderMessage(message, App, {});
});

await client.start();
```

Slack uses explicit `Blocks`, `Section`, `Actions`, and `Button` containers. See
`packages/slack/README.md` for composition rules and lifecycle details.

## 🧠 How it works

Arona implements an `@effect/ui` `Renderer.Host` for each platform:

1. A component's view builds a typed element tree with the platform vocabulary (`h.container`, `h.text`, `h.button`, ...).
2. The host serializes the tree into Components V2 or Block Kit payloads.
3. Each interactive element gets a stable generated id. When the platform sends an interaction, the client routes it back to that element and calls the renderer's `dispatch`, which sends the view's message.
4. The component's pure `update` changes the Model, the view re-renders, and the host edits the message.

## 🔭 Observability

Arona instruments message mounts, sends and edits, interactions, slash commands,
and Slack events with Effect spans, counters, and duration histograms. The
built-in telemetry runtime uses Effect's `effect/observability` OTLP exporters,
so sending telemetry to an OpenTelemetry collector only needs an endpoint:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
```

To inspect traces locally without a collector, print them to the console:

```bash
ARONA_TELEMETRY_CONSOLE=true pnpm dev
```

Both clients install the environment-configured runtime automatically. For
explicit configuration, install one before creating a client:

```ts
import { Telemetry } from "@arona/core";

Telemetry.install(
  Telemetry.create({
    endpoint: "http://localhost:4318",
    serviceName: "my-bot",
  }),
);
```

Use `Telemetry.withSpan` inside your own Effects, or `Telemetry.current().span`
around Promise APIs. Call `Telemetry.flush()` before exiting and
`Telemetry.shutdown()` to release exporters. See `packages/core/README.md` for
the full list of `OTEL_*` environment variables.

## 📚 Examples

- `examples/default` — slash command with a counter and a rendered PNG
- `examples/simple` — message-component counter, select, and modal
- `examples/rick-and-morty` — API-backed command with a character picker
- `examples/slack` — interactive Block Kit message with buttons

## 🔧 Development

Arona uses [Vite+](https://viteplus.dev) (`vp`) and pnpm:

```bash
pnpm install
pnpm build      # vp run -r build
pnpm test       # vp run -r test
pnpm check      # format, lint, and type checks
pnpm dev        # watch all packages
```

## 📝 License

MIT
