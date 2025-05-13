import { Button, useReceivedReply } from "reaccord"
import { useConsole } from "./useConsole"

export const App = () => {
  const { lines, clearLines, addLine, Console } = useConsole(5)

  useReceivedReply(async (reply) => {
    addLine(`[${reply.author.tag}]: ${reply.content}`)
    await reply.delete()
  }, [])

  return (
    <>
      <Console lines={lines} />
      <Button onClick={clearLines}>Clear console</Button>
    </>
  )
}
