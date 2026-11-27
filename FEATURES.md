# Features

## Client

- `AronaDiscordClient` and `AronaSlackClient`
- Discord command registry and automatic command refresh

## Commands

- `createSlashCommand`
- typed option helpers (`addTypedStringOption`, `addTypedIntegerOption`, ...)
- command params passed to the component as props
- `CommandProvider` for the interaction

## Data

- Effect UI `Query` services for message data
- query results drive re-renders without extra commands
- no Promise loader in the command API

## Rendering

- `renderMessage` / `mountMessage`
- custom `@effect/ui` hosts (`DiscordHost`, `SlackHost`)
- Components V2 and Slack Block Kit serialization
- interaction routing by generated ids
- modals and modal submit values
- opacity, ephemeral replies, and `unmountAfter`

## Message Components

- `Fragment` (groups multiple top-level components without adding a Discord component)
- `Container`
- `Text`
- `Section`
- `ActionRow`
- `Button`
- `LinkButton`
- `Select` / `Option`
- `UserSelect`
- `RoleSelect`
- `MentionableSelect`
- `ChannelSelect`
- `Separator`
- `Thumbnail`
- `Media` / `Gallery`
- `File`
- `Canvas` (SVG to PNG)
- `Modal`
- `Label`
- `TextInput`
- `Checkbox`
- `CheckboxGroup` / `CheckboxOption`
- `RadioGroup` / `RadioOption`
- `FileUpload`

## Slack Message Components

- `Blocks` (explicit top-level container)
- `Section`
- `Text` / `Markdown`
- `Actions`
- `Button`
- `Divider`

## Composition rules

Arona does not add structural components implicitly.

- `Button`, `LinkButton`, and all select menus must be placed in an `ActionRow`.
- `Media` and `Canvas` must be placed in a `Gallery`.
- Modal fields (`TextInput`, selects, `Checkbox`, `CheckboxGroup`, `RadioGroup`, `FileUpload`) must be placed in a `Label`.
- A Discord section must have an accessory.
- A Slack `Text` or `Markdown` must be inside a `Section`.
- A Slack `Button` must be inside `Actions` or used as a `Section` accessory.
- A Slack `Section` must contain a `Text` or `Markdown` child.
- A Slack `Actions` block must contain at least one `Button`.

## Resumable messages

- `MessageSessionStore` Layer with memory and JSON-file implementations
- session records carry component key, encoded props, `Root.snapshot` state, message reference, version, and TTL
- `mountSessionMessage` persists after mount and after every interaction
- deterministic custom ids `ar1.<session>.<version>.<key>` assigned at commit time
- gateway client lazily resumes from the store after a restart
- stale interactions heal the message from stored state and are dropped
- slash commands use sessions automatically when the client has a store
- `decodeProps` hook reattaches live props on resume

## Lifecycle

- `mountMessage` returns a `DiscordMessageRoot` or `SlackMessageRoot`
- `root.close()` is an idempotent `Effect` that clears timers, removes client routing, closes the target, and interrupts the renderer fiber
- `mountMessageScoped` closes the root automatically when its Scope ends
- `root.unmount()` is the Promise convenience
- renderer, target, and host are provided through semantic Layers

## Observability

- `Telemetry` runtime built on Effect's `effect/observability` OTLP exporters
- traces for message mount, send/edit, close, interactions, commands, Slack events, and command reloads
- counters and duration histograms for messages, renders, interactions, and commands
- environment configuration with `OTEL_*` variables and per-client/explicit runtimes
- console trace output with `ARONA_TELEMETRY_CONSOLE=true`, `OTEL_TRACES_EXPORTER=console`, or `Telemetry.create({ console: true })`
- `Telemetry.flush()` and `Telemetry.shutdown()` for orderly exporter shutdown

## Testing

- unit tests with `vite-plus/test`
- fake message targets for host and interaction tests
- telemetry configuration and disabled-runtime tests
