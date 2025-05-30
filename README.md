# Arona

Arona is a powerful framework for building chat bot applications using React. It provides a custom React renderer that allows you to create interactive bots for platforms like Discord (with Slack support coming soon) using familiar React patterns and components.

## 🚀 Quick Start

Create a new Arona application using:

```bash
bun create arona-app my-bot
cd my-bot
bun install
```

## 📦 Packages

Arona consists of three main packages:

- `@arona/core` - The core framework that implements the React renderer and bot logic
- `@arona/discord` - Discord-specific implementation and components
- `create-arona-app` - CLI tool for scaffolding new Arona applications

## 🎯 Project Goals

Arona aims to make bot development more accessible and maintainable by:

- Leveraging React's component-based architecture for bot development
- Providing a familiar development experience for React developers
- Enabling type-safe bot development with TypeScript
- Supporting multiple chat platforms (Discord, with Slack coming soon)

## 💻 Usage

Here's a basic example of how to create a simple bot using Arona:

```tsx
import { AronaDiscordClient, createSlashCommand } from "@arona/discord"
import { Events, GatewayIntentBits } from "discord.js"

const client = new AronaDiscordClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

const counter = createSlashCommand("counter", {
  command: (command) => command.setDescription("Counting example command"),
  component: () => {
    const [count, setCount] = useState(0)

    return (
        <Container>
        <Text># Step: `{count}`</Text>
        <Button
            onClick={() => {
            setCount((prev) => prev + 1)
            }}
        >
            +
        </Button>
        </Container>
    )
    }
})

client.addCommands([counter])
await client.login()
```

## 📚 Examples

Check out the `/examples` directory for complete implementation examples:

- `default` - Basic bot implementation
- `rick-and-morty` - More complex example with API integration

## 🔧 Development

To contribute to Arona:

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   ```
3. Build the packages:
   ```bash
   bun run build
   ```

## 📝 License

MIT

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
