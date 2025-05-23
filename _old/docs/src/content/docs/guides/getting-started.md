---
title: Getting started
description: A guide to help you get started with Reaccord.
---
To get started with Reaccord, follow these steps:

## Prerequisites

### Set up your Discord bot
Before using Reaccord, you'll need to set up a Discord bot on the <a href="https://discord.com/developers/applications" target="_blank">Discord Developer Portal</a>. Once your bot is created, make sure to note down your bot **token** and **client ID**

<!-- Optionally your development guild ID. -->
Optionally, you can create a development guild *(server)* to test your bot. Make sure to note down your guild ID.
This is highly recommended if you intend to use slash (or any other type of) commands, as they will refresh instantly in your development guild, as opposed to refreshing in up to 24h in production guilds.

### Install Reaccord

```bash
npm install reaccord
or
yarn add reaccord
or
pnpm add reaccord
or
bun add reaccord
```

### Create Reaccord config file

Create a `reaccord.config.js` file in the root of your project and add the following code:

```js
/** @type {import('reaccord').ReaccordConfig} */
module.exports = {
  entry: "./path/to/your/bot.js",
}
```

Replace `./path/to/your/bot.js` with the path to your bot file that we will create in the next step.

## Let's get started!

### Setup your Reaccord bot
Create a new file, for example `bot.jsx` or `bot.tsx`, and add the following code:

```jsx
import { createClient } from "reaccord"

const client = createClient({
  token: DISCORD_TOKEN,
  intents: [],
  devGuildId: DISCORD_DEV_GUILD_ID,
  clientId: DISCORD_CLIENT_ID,
})
```

This code creates a new Reaccord client with the provided options. Replace `DISCORD_TOKEN`, `DISCORD_DEV_GUILD_ID`, and `DISCORD_CLIENT_ID` with your bot's token, development guild ID, and client ID respectively.

### Define and register commands
Use createSlashCommand to define slash commands and register them with your Reaccord client.
You can add parameters to your commands, and render a component when the command is executed.

```jsx
const myCoolCommand = createSlashCommand("rick", "Rick and Morty characters info.")
  .stringParam("username", "Your name")
  .render(
    ({ username }) => (
      <>Hello {username ?? "World"}</>
    )
  )

client.registerCommand(rickCmd)
```

### Connect your bot
Finally, connect your bot to Discord:

```jsx
client.connect((client) =>
  console.log(`🚀 Client connected as ${client.user?.username}!`),
)
```

### Start your bot
To start your bot, run the following command:

```bash
npx reaccord dev
```

That's it! You've now set up a basic Discord bot using Reaccord.

For more advanced usage, check out the [API Reference](/reference).
