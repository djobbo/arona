// import { Client, Events, GatewayIntentBits, REST, Routes } from "discord.js"
// import type { SlashCommandBuilder } from "discord.js"

// const AronaClient = Client

// const client = new AronaClient({
//   intents: [GatewayIntentBits.Guilds],
// })

// client.once(Events.ClientReady, (readyClient) => {
//   console.log(`Ready! Logged in as ${readyClient.user.tag}`)
// })

// const rest = new REST().setToken(token)

// const reloadCommands = async (commands: SlashCommandBuilder[]) => {
//   try {
//     console.log(
//       `Started refreshing ${commands.length} application (/) commands.`,
//     )

//     // The put method is used to fully refresh all commands in the guild with the current set
//     const data = await rest.put(
//       Routes.applicationGuildCommands(clientId, guildId),
//       { body: commands },
//     )

//     console.log(
//       `Successfully reloaded ${data.length} application (/) commands.`,
//     )
//   } catch (error) {
//     // And of course, make sure you catch and log any errors!
//     console.error(error)
//   }
// }

// // Log in to Discord with your client's token
// client.login(token)

import * as counter from "./counter"

let currentCounter = counter
currentCounter.start()

console.log("🟢 index.ts started")

if (import.meta.hot) {
  import.meta.hot.accept("./counter", (newModule) => {
    console.log("♻️ counter.ts updated")

    // Clean up the old one
    currentCounter.stop()

    // Use the new module
    currentCounter = newModule
    currentCounter.start()
  })

  import.meta.hot.accept(() => {
    console.log("♻️ index.ts updated")
  })

  import.meta.hot.dispose(() => {
    console.log("🧹 index.ts dispose")
    currentCounter.stop()
  })
}
