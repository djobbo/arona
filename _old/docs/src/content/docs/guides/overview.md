---
title: Overview
description: An introduction to Reaccord.
---

Reaccord is a library that bridges the gap between Discord bots and React, allowing developers to build interactive Discord bots using the power of React. 

Reaccord provides a simple and intuitive API for creating and managing Discord bots, making it easy to build complex and interactive bots with minimal effort.

## Motivation

Building interactive Discord bots can be challenging, especially for developers who are new to Discord bot development. Reaccord aims to simplify the process of building Discord bots by providing a familiar and easy-to-use API that leverages the power of React.

- **Familiar API**: `Components`, `Hooks` and `JSX`: Reaccord's API is React's API, making it easy for developers to build your bot's UI and logic the same tools and patterns you already know and love.

- **Fully typed**: Reaccord is written in `TypeScript` and leverages `Discord.js`'s type definitions, providing a fully typed API that makes it easy to build complex bots without worrying about type errors.

- **Powerful features**: Reaccord provides a wide range of features out of the box, including support for `slash commands`, `message components` with interactivity, `embeds`, and more.

## Show me the code!

Here's a simple example of a Reaccord bot that responds to the `/count` command with an interactive counter:

```jsx
import { GatewayIntentBits } from "discord.js"
import { createClient, createSlashCommand } from "reaccord"
import { useState } from "react"

// Create gateway client
const client = createClient({
  token: DISCORD_TOKEN,
  intents: [GatewayIntentBits.Guilds],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})

// Create Counter component
export const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <>
      <Span bold>{count}</Span>
      <Button onClick={() => setCount(count + 1)}>+</Button>
    </>
  )
}

// Create /count command
const counterCommand = createSlashCommand("counter", "A simple counter")
  .render(() => <Counter />)

client.registerCommand(counterCommand)

// Connect client to Discord's API gateway
client.connect(() =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
```