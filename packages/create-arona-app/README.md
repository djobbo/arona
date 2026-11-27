# create-arona-app

Create a new [Arona](https://github.com/djobbo/arona) app with one command.

```bash
pnpm create arona-app my-bot
```

## Templates

- `default` - A basic Arona app setup with essential features
- `rick-and-morty` - An example app that demonstrates API integration with the Rick and Morty API
- `simple` - A basic Arona app setup with essential features
- `slack` - A Slack bot with interactive Block Kit messages

## Development

```bash
pnpm install
pnpm build
```

The build copies the workspace examples into `templates/` and rewrites them to standalone packages.
