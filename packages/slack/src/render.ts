export type InteractionRef = KnownEventFromType<"message">

import { createRenderer } from "@arona/core"
import type { KnownEventFromType } from "@slack/bolt"
import { SlackRootNode } from "./slack-root-node"

type MessageRenderOptions = {
	ephemeral?: boolean
	unmountAfter?: number
}

export const render = createRenderer<
	SlackRootNode,
	{ interactionRef: InteractionRef; messageRenderOptions: MessageRenderOptions }
>((reconcilerInstance, { interactionRef, messageRenderOptions }) => {
	return new SlackRootNode(
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
