import { createContext, useContext, useEffect, useReducer } from "react"
import type { Client } from "../Client"
import type { Message } from "discord.js"
import type { RootNode } from "../renderer/RootNode"

const rootNodeContextInternal = createContext<RootNode | null>(null)

export const useRootNodeContextInternal = () => {
  const [, forceUpdate] = useReducer(() => ({}), {})
  const rootNode = useContext(rootNodeContextInternal)

  if (!rootNode) {
    throw new Error("useMessageCtx must be used inside a MessageProvider")
  }

  useEffect(() => rootNode.addHydrationHook(() => forceUpdate()), [])

  return rootNode
}

export type MessageContext = {
  client: Client
  /**
   * Message will be `null` on the initial render.
   */
  message: Message | null
  terminateInteraction: () => void
}

export const useMessageCtx = (): MessageContext => {
  const rootNode = useRootNodeContextInternal()

  return {
    client: rootNode.discordClient,
    message: rootNode.message,
    terminateInteraction: rootNode.terminateInteraction,
  }
}

export type MessageProviderProps = {
  rootNode: RootNode
  children?: JSX.Element
}

export const MessageProvider = ({
  rootNode,
  children,
}: MessageProviderProps) => {
  return (
    <rootNodeContextInternal.Provider value={rootNode}>
      {children}
    </rootNodeContextInternal.Provider>
  )
}
