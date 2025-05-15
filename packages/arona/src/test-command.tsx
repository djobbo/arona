import {
  ActionRow,
  Button,
  Container,
  LinkButton,
  Section,
  Separator,
  Text,
} from "./features/renderer/components"
import { ButtonStyle, SeparatorSpacingSize } from "discord.js"
import { Gallery, Media } from "./features/renderer/components/media-gallery"
import { Option, Select } from "./features/renderer/components/select"
import { createSlashCommand } from "./features/command/create-slash-command"
import { useState } from "react"

const Component = (): JSX.Element => {
  const {
    loaderData,
    interaction: {
      user,
      params: { msg, target },
    },
  } = testCommand.useCommandContext()
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState<string | undefined>(undefined)

  return (
    <Container accentColor="Orange">
      <Gallery>
        <Media
          media={{
            url: target.displayAvatarURL({ size: 128 }),
          }}
        />
        <Media
          media={{
            url: user.displayAvatarURL({ size: 128 }),
          }}
        />
      </Gallery>
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
      <Separator spacing={SeparatorSpacingSize.Large} />
      <Text>**Select Menu** {!!selected && <>`{selected}`</>}</Text>
      <Select onChange={([value]) => setSelected(value)}>
        <Option
          value="option1"
          description="This is option 1"
          selected={selected === "option1"}
        >
          Option 1
        </Option>
        <Option
          value="option2"
          description="This is option 2"
          selected={selected === "option2"}
        >
          Option 2
        </Option>
      </Select>
      <Separator />
      <Text>
        # {loaderData.greeting} Sending `{msg}` to {`<@${target.id}>`}
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

export const testCommand = createSlashCommand("ping", {
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
