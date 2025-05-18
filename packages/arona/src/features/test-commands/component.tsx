import {
  ActionRow,
  Button,
  Container,
  Gallery,
  LinkButton,
  Media,
  Option,
  Section,
  Select,
  Separator,
  Text,
} from "../renderer/components"
import { ButtonStyle, SeparatorSpacingSize } from "discord.js"
import { MyModal } from "./modal"
import { testCommand } from "./test-command"
import { useModal } from "../renderer/components/modal"
import { useState } from "react"

export const Component = (): JSX.Element => {
  const {
    loaderData,
    interaction: {
      user,
      params: { msg, target },
    },
  } = testCommand.useCommandContext()
  const [count, setCount] = useState(0)
  const [selected, setSelected] = useState<string | undefined>(undefined)
  const [text, setText] = useState("")

  const { openModal } = useModal()

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
          <Button
            onClick={() => setCount((prev) => prev - 1)}
            style={ButtonStyle.Danger}
          >
            Decrementasdasdsadsadsa
          </Button>
        }
      >
        <Text>## Section 1</Text>
        <Text>### Section 2</Text>
        {text && <Text>~~{text}~~</Text>}
      </Section>
      <ActionRow>
        <Button
          style={ButtonStyle.Primary}
          onClick={openModal(() => (
            <MyModal text={text} setText={setText} />
          ))}
        >
          Open Modal
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
        Incrementasdasda
      </Button>
      <Separator />
      <Text>## Count `{count}`</Text>
    </Container>
  )
}
