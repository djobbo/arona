import { AronaRootNode } from "./nodes/root"
import { hostConfig } from "./hostConfig"
import createReconciler from "react-reconciler"
import type {
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  SendableChannels,
} from "discord.js"

export type InteractionRef =
  | SendableChannels
  | Message
  | ChatInputCommandInteraction
  | ContextMenuCommandInteraction
  | ModalSubmitInteraction
  | MessageComponentInteraction

export const reactReconcilerInstance = createReconciler(hostConfig)
reactReconcilerInstance.injectIntoDevTools({
  bundleType: process.env.NODE_ENV === "development" ? 1 : 0,
  rendererPackageName: "arona",
  version: "0.0.0",
})

export const render = async (
  Code: () => JSX.Element,
  interactionRef: InteractionRef,
  messageRenderOptions?: MessageRenderOptions,
) => {
  const root = new AronaRootNode(
    interactionRef,
    messageRenderOptions,
    reactReconcilerInstance,
  )
  await root.initialRender(Code)
  return root
}
