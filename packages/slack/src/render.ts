import {type ChatPostMessageResponse as Message} from '@slack/web-api'


export type InteractionRef =
	| Message

import { createRenderer } from "@arona/core"
import { SlackRootNode } from "./slack-root-node"
import type { SlackClient } from './client'

type MessageRenderOptions = {
	ephemeral?: boolean
	unmountAfter?: number
}

export const render = createRenderer<
SlackRootNode,
	{ slackClient: SlackClient, interactionRef: InteractionRef; messageRenderOptions: MessageRenderOptions }
>((reconcilerInstance, { slackClient, interactionRef, messageRenderOptions }) => {
	return new SlackRootNode(
        slackClient,
		reconcilerInstance,
		interactionRef,
		messageRenderOptions,
	)
})

export const renderMessage = async (
    slackClient: SlackClient,
	ref: InteractionRef,
	Code: () => JSX.Element,
	options: MessageRenderOptions = {},
) => {
	const rootNode = await render(Code, {
        slackClient,
		interactionRef: ref,
		messageRenderOptions: options,
	})
	return rootNode.message
}
