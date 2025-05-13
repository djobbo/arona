import { MessageProvider } from "../hooks/MessageContext"
import type { RootNode } from "./RootNode"

export const renderWithRootContext = (
  Code: () => JSX.Element,
  rootNode: RootNode,
) => {
  return (
    <MessageProvider rootNode={rootNode}>
      <Code />
    </MessageProvider>
  )
}
