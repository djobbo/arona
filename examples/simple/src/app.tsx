import { useModal, Text, ActionRow, Button, Modal, TextInput, Container, Separator, Select, Option, Section } from '@arona/discord'
import { useState } from 'react'
import { Message } from 'discord.js'

type AppProps = {
  message: Message
}

export const App = ({message}: AppProps) => {
  const [count, setCount] = useState(0)
  const {openModal} = useModal()

    return (
      <>
        <Text>-# Original Message: `{message.content}`</Text>
        <Container accentColor="Red">
          <Section accessory={
            <Button onClick={() => setCount(count + 1)}>Add One</Button>
          }>
        <Text># Count `{count}`</Text>
          </Section>
        </Container>
      <Select onChange={(value) => console.log(value)} maxValues={2}>
        <Option value='1'>1</Option>
        <Option value='2'>2</Option>
        <Option value='3' selected>3</Option>
      </Select>
      <Button onClick={openModal(() => (
        <Modal title="test">
          <TextInput label="test" name="test" onChange={(value) => console.log(value)} />
        </Modal>
      ))}>Open Modal</Button>
      <Separator/>
      <Text>-# Updated At `{new Date().toISOString()}`</Text>
    </>
    )
  }
  