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

import { createRenderer } from "@arona/core"
import { DiscordRootNode } from "./discord-root-node"

type MessageRenderOptions = {
	ephemeral?: boolean
	unmountAfter?: number
}

export const render = createRenderer<
	DiscordRootNode,
	{ interactionRef: InteractionRef; messageRenderOptions: MessageRenderOptions }
>((reconcilerInstance, { interactionRef, messageRenderOptions }) => {
	return new DiscordRootNode(
		reconcilerInstance,
		interactionRef,
		messageRenderOptions,
	)
})

export const renderMessage = async (
	ref: InteractionRef,
	Code: () => JSX.Element,
	options: MessageRenderOptions = {},
) => {
	const rootNode = await render(Code, {
		interactionRef: ref,
		messageRenderOptions: options,
	})
	return rootNode.message
}
