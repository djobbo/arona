import {
  ActionRow,
  Button,
  Container,
  LinkButton,
  Section,
  Separator,
  Text,
} from "./features/renderer/components"
import { AronaClient } from "./features/discord-client/client"
import { ButtonStyle, Events, GatewayIntentBits } from "discord.js"
import { createSlashCommand } from "./features/command/create-slash-command"
import { useState } from "react"

const client = new AronaClient({
  token: process.env.DISCORD_APP_TOKEN!,
  clientId: process.env.DISCORD_APP_ID!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID,
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, () => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

const Component = (): JSX.Element => {
  const {
    loaderData,
    interaction: {
      params: { msg, target },
    },
  } = command.useCommandContext()
  const [count, setCount] = useState(0)

  return (
    <Container accentColor="Yellow">
      <Section
        accessory={
          <Button onClick={() => setCount((prev) => prev - 1)}>
            Decrement
          </Button>
        }
      >
        <Text>## Section 1</Text>
        <Text>### Section 2</Text>
        <Text>~~Section 3~~</Text>
      </Section>
      <ActionRow>
        <Button
          style={ButtonStyle.Primary}
          onClick={() => {
            console.log("Clicked")
          }}
        >
          Click me
        </Button>
        <Button
          style={ButtonStyle.Secondary}
          onClick={() => {
            console.log("Clicked")
          }}
        >
          Click me
        </Button>
        <LinkButton url="https://google.com">Google</LinkButton>
      </ActionRow>
      <Separator />
      <Text>
        # {loaderData.greeting} Sending {msg} to {`<@${target.id}>`}
      </Text>
      <Button
        style={ButtonStyle.Danger}
        onClick={() => setCount((prev) => prev + 1)}
      >
        Increment
      </Button>
      <Separator />
      <Text>## Count `{count}`</Text>
    </Container>
  )
}

const command = createSlashCommand("ping", {
  command: (command) =>
    command
      .setDescription("Replies with Pong!")
      .addTypedStringOption((option) =>
        option
          .setName("msg")
          .setDescription("The input to echo back")
          .setRequired(true),
      )
      .addTypedUserOption((option) =>
        option.setName("target").setDescription("Goat").setRequired(true),
      ),
  loader: async () => {
    return {
      greeting: "Hello",
    }
  },
  component: Component,
})

client.addCommands([command])
await client.login()

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("♻️ index.ts updated")
  })

  import.meta.hot.dispose(() => {
    console.log("🧹 index.ts dispose")
  })
}
