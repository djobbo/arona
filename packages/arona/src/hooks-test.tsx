import { AronaClient } from "./features/discord-client/client"
import { GatewayIntentBits } from "discord.js"
import { render } from "./features/renderer/render"
import React, { useState } from "react"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

const Component = () => {
  console.log(require.resolve("react"))

  const [count, setCount] = useState(2)
  return (
    <>
      {count}
      TEST
    </>
  )
}

render(
  Component,
  {
    client,
    send: (a) => {
      console.log(a)
    },
  },
  {},
)
