import { RootNode } from "./RootNode"
import { hostConfig } from "./hostConfig"
import createReconciler from "react-reconciler"
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  TextBasedChannel,
} from "discord.js"
import type { Client, MessageRenderOptions } from "../Client"

export type InteractionRefType =
  | TextBasedChannel
  | Message
  | ChatInputCommandInteraction
  | ContextMenuCommandInteraction
  | ModalSubmitInteraction
  | MessageComponentInteraction

const reactReconcilerInstance = createReconciler(hostConfig)
reactReconcilerInstance.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === "development" ? 1 : 0,
  rendererPackageName: "reaccord",
  version: "0.0.0",
})

export const renderMessage = async (
  Code: () => JSX.Element,
  discordClient: Client,
  ref: InteractionRefType,
  rootOptions?: MessageRenderOptions,
) => {
  const root = new RootNode(discordClient, reactReconcilerInstance)
  await root.replyToInteraction(ref, Code, rootOptions)
  return root
}
