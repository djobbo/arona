# @arona/core

The platform-agnostic part of Arona:

- the `arona` CLI, powered by Vite's SSR build and watch mode
- `CommandRegistry`, the name-keyed command store used by platform clients
- `BotNode`, `BotHost`, and `BotMessageTarget`: the shared renderer tree, host operations, and coalescing message lifecycle
- `mountBotMessage`, the scoped mount used by the Discord and Slack integrations
- `Telemetry`, an OTLP observability runtime built on Effect's `effect/observability` exporters
- small shared helpers

```bash
# build a bot
arona build ./src/index.ts

# watch, rebuild, and restart the bot
arona dev ./src/index.ts
```

Bots are built as Node SSR bundles. Workspace packages stay external so native
modules and peer singletons resolve at runtime.

## Observability

Arona traces message mounts, sends, edits, interactions, slash commands, Slack
events, and command reloads with Effect spans, and records matching counters and
duration histograms. The Discord and Slack clients install an environment-based
runtime automatically, so a collector endpoint is all you need:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 pnpm dev
```

For local debugging without a collector, print finished spans to the console:

```bash
ARONA_TELEMETRY_CONSOLE=true pnpm dev
```

Or pass `console: true` when creating a runtime:

```ts
Telemetry.install(Telemetry.create({ console: true }));
```

Console spans are indented by nesting depth and include duration and attributes.
Console mode replaces the OTLP trace exporter; metrics and logs still use an
endpoint when one is configured.

Supported variables:

- `OTEL_EXPORTER_OTLP_ENDPOINT` — OTLP/HTTP base URL (defaults to `http://localhost:4318` when `ARONA_TELEMETRY=1`)
- `OTEL_EXPORTER_OTLP_{TRACES,METRICS,LOGS}_ENDPOINT` — per-signal endpoint overrides
- `ARONA_TELEMETRY_CONSOLE=true` or `OTEL_TRACES_EXPORTER=console` — print spans to the console
- `OTEL_SERVICE_NAME`, `OTEL_SERVICE_VERSION`, `OTEL_RESOURCE_ATTRIBUTES`
- `OTEL_EXPORTER_OTLP_HEADERS`, `OTEL_EXPORTER_OTLP_COMPRESSION`
- `OTEL_{TRACES,METRICS,LOGS}_EXPORTER=otlp` and `ARONA_TELEMETRY_{TRACES,METRICS,LOGS}`
- `OTEL_SDK_DISABLED=true` or `ARONA_TELEMETRY=0` to disable everything

Or install a runtime explicitly before creating a client:

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
around Promise APIs. The clients accept a `telemetry` option for an explicit
runtime. Flush buffered telemetry with `Telemetry.flush()` before a process
exits, and dispose it with `Telemetry.shutdown()`.
