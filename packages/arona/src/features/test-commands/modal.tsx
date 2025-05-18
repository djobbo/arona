import { Modal, TextInput } from "../renderer/components"
import { TextInputStyle } from "discord.js"

export const MyModal = ({
  text,
  setText,
}: {
  text: string
  setText: (text: string) => void
}) => {
  return (
    <Modal title="hello" onSubmit={(props) => console.log("Submitted", props)}>
      <TextInput
        style={TextInputStyle.Short}
        label="hello my friends"
        name="test"
        onChange={(value) => setText(value)}
        value={text}
      />
    </Modal>
  )
}
