# Arona Slack example

```bash
pnpm install
cp .env.example .env
pnpm dev
```

Set `SLACK_BOT_TOKEN` and `SLACK_APP_TOKEN` in `.env`. The example uses Socket
Mode, so no public request URL is needed.

`pnpm dev` watches the sources, rebuilds the bot, and restarts it. `pnpm build`
writes a production bundle to `dist/index.js`.

In development the example installs a console telemetry runtime, so message,
event, and interaction spans are printed to the terminal. Swap
`Telemetry.create({ console: true })` for an OTLP configuration to send traces
to a collector instead.
