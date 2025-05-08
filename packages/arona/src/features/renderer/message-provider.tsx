import { createContext, useContext, useEffect, useReducer } from "react"
import type { AronaClient } from "../discord-client/client"
import type { AronaRootNode } from "./nodes/root"
import type { Message } from "discord.js"

const rootNodeContextInternal = createContext<AronaRootNode | null>(null)

export const useMessageInternal = () => {
  const [, forceUpdate] = useReducer(() => ({}), {})
  const rootNode = useContext(rootNodeContextInternal)

  if (!rootNode) {
    throw new Error("useMessageCtx must be used inside a MessageProvider")
  }

  useEffect(() => rootNode.addHydrationHook(() => forceUpdate()), [])

  return rootNode
}

export type MessageContext = {
  client: AronaClient
  /**
   * Message will be `null` on the initial render.
   */
  message: Message | null
  unmount: () => void
}

export const useMessage = (): MessageContext => {
  const rootNode = useMessageInternal()

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
    <rootNodeContextInternal.Provider value={rootNode}>
      {children}
    </rootNodeContextInternal.Provider>
  )
}
