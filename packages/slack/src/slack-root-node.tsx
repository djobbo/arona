import { AronaRootNode, type ReconcilerInstance } from "@arona/core"
import { renderComponentNodes } from "@arona/core"
import type { ChatPostMessageResponse as Message } from "@slack/web-api"
import type { SlackClient } from "./client"
import { topLevelComponents } from "./components/helpers/top-level-components"
import type { InteractionRef } from "./render"
import type { InteractionListener } from "./types"

type WithAronaContext<T> = T & {
	arona: {
		client: SlackClient
	}
}

export const hasAronaContext = (
	ref: InteractionRef,
): ref is WithAronaContext<InteractionRef> => {
	return "arona" in ref
}

export interface MessageRenderOptions {
	unmountAfter?: number
}

const renderRootComponents = renderComponentNodes([...topLevelComponents])

export class SlackRootNode extends AronaRootNode {
	slackClient: SlackClient
	interactionRef: InteractionRef | null = null
	message: Message | null = null
	waitForMessageCreation: Promise<Message> | null = null
	hydrationHooks: ((message: Message) => void)[] = []
	#interactionListeners = new Map<string, InteractionListener>()
	messageRenderOptions: MessageRenderOptions = {}
	lastMessageUpdatePromise: Promise<Message> | null = null
	#unmountTimeout: Timer | null = null

	constructor(
		reconcilerInstance: ReconcilerInstance,
		interactionRef: InteractionRef,
		messageRenderOptions: MessageRenderOptions,
	) {
		super(reconcilerInstance, [])
		if (!hasAronaContext(interactionRef)) {
			throw new Error("Interaction ref is not an Arona interaction ref")
		}

		this.slackClient = interactionRef.arona.client
		this.interactionRef = interactionRef
		this.messageRenderOptions = messageRenderOptions
		this.slackClient.addRoot(this)
	}

	override unmount() {
		super.unmount()
		this.#interactionListeners.clear()
		this.slackClient.removeRoot(this.uuid)
		this.#unmountTimeout && clearTimeout(this.#unmountTimeout)
	}

	interactionListener: InteractionListener = async (payload) => {
		if (this.unmounted || !this.message) return
		if (!("action_id" in payload.payload)) return

		const actionId = payload.payload.action_id

		const listener = this.#interactionListeners.get(actionId)
		listener?.(payload)
	}

	addHydrationHook(fn: (message: Message) => void) {
		this.hydrationHooks.push(fn)
		return () => {
			this.hydrationHooks = this.hydrationHooks.filter((hook) => hook !== fn)
		}
	}

	override async initialRender(Code: () => JSX.Element) {
		if (this.messageRenderOptions.unmountAfter) {
			this.#unmountTimeout = setTimeout(() => {
				this.unmount()
			}, this.messageRenderOptions.unmountAfter)
		}
		await super.initialRender(Code)
		return this.message
	}

	protected override async performRender(): Promise<void> {
		if (!this.interactionRef) throw new Error("No interaction ref")

		const content = renderRootComponents(this.children)
		const components = content
			.map((component) =>
				"components" in component ? component.components : [],
			)
			.flat()
		const files = content
			.map((component) => ("files" in component ? component.files : []))
			.flat()
		const interactionListeners = content
			.map((component) =>
				"listenerEntries" in component ? component.listenerEntries : [],
			)
			.flat()
		const isEmptyMessage = components.length === 0

		this.#interactionListeners = new Map(interactionListeners)

		if (!this.message) {
			if (!this.waitForMessageCreation) {
				const createMessageAndHydrate = async () => {
					if (!this.interactionRef?.channel) throw new Error("No ref")

					let reply: Message | null | undefined = null

					reply = await this.slackClient.client.chat.postMessage({
						channel: this.interactionRef.channel,
						thread_ts: this.interactionRef.ts,
						blocks: components,
					})

					if (!reply) throw new Error("No message created")
					this.message = reply

					if (this.hydrationHooks.length > 0) {
						for (const hook of this.hydrationHooks) {
							hook(reply)
						}
					}

					return reply
				}

				this.waitForMessageCreation = createMessageAndHydrate()
				this.message = await this.waitForMessageCreation
				return
			}

			this.message = await this.waitForMessageCreation
		}

		if (!this.message?.ts || !this.message.channel)
			throw new Error("Message cannot be updated")

		await this.slackClient.client.chat.update({
			channel: this.message.channel,
			ts: this.message.ts,
			blocks: components,
		})
	}
}
