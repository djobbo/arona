# Arona example

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Set `DISCORD_APP_TOKEN`, `DISCORD_APP_ID`, and optionally `DISCORD_DEV_GUILD_ID` in `.env`.

`pnpm dev` watches the sources, rebuilds the bot, and restarts it. `pnpm build` writes a production bundle to `dist/index.js`.

In development the example installs a console telemetry runtime, so message,
command, and interaction spans are printed to the terminal. Swap
`Telemetry.create({ console: true })` for an OTLP configuration to send traces
to a collector instead.
