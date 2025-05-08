import { AronaRootNode } from "./nodes/root"
import { hostConfig } from "./hostConfig"
import createReconciler from "react-reconciler"
import type { AronaClient } from "../discord-client/client"
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  TextBasedChannel,
} from "discord.js"

export type InteractionRef =
  | TextBasedChannel
  | Message
  | ChatInputCommandInteraction
  | ContextMenuCommandInteraction
  | ModalSubmitInteraction
  | MessageComponentInteraction

const reactReconcilerInstance = createReconciler(hostConfig)
reactReconcilerInstance.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === "development" ? 1 : 0,
  rendererPackageName: "arona",
  version: "0.0.0",
})

export const render = async (
  Code: () => JSX.Element,
  discordClient: AronaClient,
  interactionRef: InteractionRef,
  messageRenderOptions?: MessageRenderOptions,
) => {
  const root = new AronaRootNode(
    discordClient,
    interactionRef,
    messageRenderOptions,
    reactReconcilerInstance,
  )
  await root.initialRender(Code)
  return root
}
