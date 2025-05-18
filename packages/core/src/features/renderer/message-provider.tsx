import { createContext, useContext } from "react"
import type { AronaRootNode } from "./nodes/root"

const messageContext = createContext<AronaRootNode | null>(null)

export const useMessageInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY =
  () => {
    const rootNode = useContext(messageContext)

    if (!rootNode) {
      throw new Error(
        "useMessageInternal must be used inside a MessageProvider",
      )
    }

    return rootNode
  }

export const useMessage = () => {
  const rootNode = useContext(messageContext)

  if (!rootNode) {
    throw new Error("useMessage must be used inside a MessageProvider")
  }

  return {
    client: rootNode.discordClient,
    message: rootNode.message,
    unmount: rootNode.unmount,
  }
}

export type MessageProviderProps = {
  rootNode: AronaRootNode
  children?: JSX.Element
}

export const MessageProvider = ({
  rootNode,
  children,
}: MessageProviderProps) => {
  return (
    <messageContext.Provider value={rootNode}>
      {children}
    </messageContext.Provider>
  )
}
