---
title: Overview
description: An introduction to Arona.
---

Arona is a library that bridges the gap between Discord bots and React, allowing developers to build interactive Discord bots using the power of React. 

Arona provides a simple and intuitive API for creating and managing Discord bots, making it easy to build complex and interactive bots with minimal effort.

## Motivation

Building interactive Discord bots can be challenging, especially for developers who are new to Discord bot development. Arona aims to simplify the process of building Discord bots by providing a familiar and easy-to-use API that leverages the power of React.

- **Familiar API**: `Components`, `Hooks` and `JSX`: Arona's API is React's API, making it easy for developers to build your bot's UI and logic the same tools and patterns you already know and love.

- **Fully typed**: Arona is written in `TypeScript` and leverages `Discord.js`'s type definitions, providing a fully typed API that makes it easy to build complex bots without worrying about type errors.

- **Hot Module Replacement**: Arona supports hot module replacement, making it easy to develop and test your bot's UI and logic without restarting the bot.

- **Powerful features**: Arona provides a wide range of features out of the box, including support for `slash commands`, `interactive message components`, `modals`, and more.

## Show me the code!

Here's a simple example of a Arona bot that responds to the `/count` command with an interactive counter:

```jsx
import { AronaDiscordClient, createSlashCommand, Button, Text } from "@arona/discord"
import { Events, GatewayIntentBits } from "discord.js"
import { useState } from "react"

// Create the client
const client = new AronaDiscordClient({
  token: "your-token-here",
  clientId: "your-app-id-here",
  devGuildId: "your-dev-guild-id-here",
  intents: [GatewayIntentBits.Guilds],
})

// Log in the client
client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

// Define the counter component
export const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <>
      <Text># Step: `{count}`</Text>
      <Button
        onClick={() => {
          setCount((prev) => prev + 1)
        }}
      >
        +
      </Button>
    </>
  )
}

// Define the counter command
const counter = createSlashCommand("counter", {
  command: (command) => command.setDescription("Counting example command"),
  component: Counter,
})

// Add the command to the client
client.addCommands([counter])
await client.login()
```