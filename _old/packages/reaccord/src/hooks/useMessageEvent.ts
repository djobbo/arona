import { useEffect, useReducer } from "react"
import { useMessageCtx } from "./MessageContext"
import type { DependencyList } from "react"
import type { EventHandler } from "../Client"
import type { Message } from "discord.js"

type EventHandlerOptions = Partial<{
  allowBot: boolean
  allowMe: boolean
}>

export const useReactionAdded = (
  handler: EventHandler<"messageReactionAdd">,
  deps: DependencyList | undefined = [],
  { allowBot = true, allowMe = true }: EventHandlerOptions = {},
) => {
  const { client, message } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo("messageReactionAdd", (reaction, user) => {
        if (!message) return
        if (reaction.message.id !== message.id) return
        if (!allowBot && user.bot) return
        if (!allowMe && reaction.me) return

        handler(reaction, user)
      }),
    [message, ...deps],
  )
}

export const useReactionRemoved = (
  handler: EventHandler<"messageReactionRemove">,
  deps: DependencyList | undefined = [],
  { allowBot = true, allowMe = true }: EventHandlerOptions = {},
) => {
  const { client, message } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo("messageReactionRemove", (reaction, user) => {
        if (!message) return
        if (reaction.message.id !== message.id) return
        if (!allowBot && user.bot) return
        if (!allowMe && reaction.me) return

        handler(reaction, user)
      }),
    [message, ...deps],
  )
}

export const useAllReactionRemoved = (
  handler: EventHandler<"messageReactionRemoveAll">,
  deps: DependencyList | undefined = [],
) => {
  const { client, message } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo(
        "messageReactionRemoveAll",
        async (reactionMessage, reactions) => {
          if (!message) return
          if (reactionMessage.id !== message.id) return
          await handler(reactionMessage, reactions)
        },
      ),
    [message, ...deps],
  )
}

export const useReactionEmojiRemoved = (
  handler: EventHandler<"messageReactionRemoveEmoji">,
  deps: DependencyList | undefined = [],
) => {
  const { client, message } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo("messageReactionRemoveEmoji", async (reaction) => {
        if (!message) return
        if (reaction.message.id !== message.id) return
        await handler(reaction)
      }),
    [message, ...deps],
  )
}

export const useReceivedReply = (
  handler: EventHandler<"messageCreate">,
  deps: DependencyList | undefined = [],
  { allowBot = true, allowMe = true }: EventHandlerOptions = {},
) => {
  const { client, message } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo("messageCreate", async (createdMessage) => {
        if (!message) return
        if (
          !createdMessage.reference?.messageId ||
          createdMessage.reference.messageId !== message.id
        )
          return
        if (!allowBot && message.author.bot) return
        if (!allowMe && message.author.id === client.user?.id) return

        await handler(createdMessage)
      }),
    [message, ...deps],
  )
}

export const useMessageCreated = (
  handler: (message: Message) => void | Promise<void>,
  deps: DependencyList | undefined = [],
) => {
  const [isInitialRender, dispatchRendered] = useReducer(() => false, true)
  const { message } = useMessageCtx()

  useEffect(() => {
    if (!!message && isInitialRender) {
      handler(message)
      dispatchRendered()
    }
  }, [!message, isInitialRender, ...deps])
}

export const useMessageDeleted = (
  handler: EventHandler<"messageDelete">,
  deps: DependencyList | undefined = [],
) => {
  const { client, message, terminateInteraction } = useMessageCtx()

  useEffect(
    () =>
      client.listenTo("messageDelete", async (deletedMessage) => {
        if (!message) return
        if (deletedMessage.id !== message.id) return

        await Promise.all([terminateInteraction(), handler(deletedMessage)])
      }),
    [message, ...deps],
  )
}
