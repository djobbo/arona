import { AronaNode, AronaRootNode, type ReconcilerInstance } from "@arona/core"
import { renderComponentNodes } from "@arona/core"
import { BaseInteraction, Message, MessageFlags } from "discord.js"
import type { Interaction } from "discord.js"
import type { FiberRoot } from "react-reconciler"
import type { DiscordClient } from "./client"
import { containerComponent } from "./components/container"
import { topLevelComponents } from "./components/helpers/top-level-components"
import { modalComponent } from "./components/modal"
import type { ModalComponent } from "./components/modal"
import type { ModalInteractionRef } from "./components/modal"
import { EMPTY_STRING } from "./constants"
import type { InteractionRef } from "./render"

const MESSAGE_FLAGS = MessageFlags.IsComponentsV2

export interface MessageRenderOptions {
	ephemeral?: boolean
	unmountAfter?: number
}

const renderRootComponents = renderComponentNodes([
	containerComponent,
	...topLevelComponents,
])

export class DiscordRootNode extends AronaRootNode {
	discordClient: DiscordClient
	interactionRef: InteractionRef | null = null
	message: Message | null = null
	waitForMessageCreation: Promise<Message> | null = null
	hydrationHooks: ((message: Message) => void)[] = []
	#interactionListeners = new Map<
		string,
		(interaction: Interaction) => unknown
	>()
	#modalInteractionListener: ((interaction: Interaction) => unknown) | null =
		null
	messageRenderOptions: MessageRenderOptions = {}
	lastMessageUpdatePromise: Promise<Message> | null = null
	#unmountTimeout: Timer | null = null
	#modalContainer: FiberRoot | null = null
	#modalRoot: AronaNode | null = null

	constructor(
		reconcilerInstance: ReconcilerInstance,
		interactionRef: InteractionRef,
		messageRenderOptions: MessageRenderOptions,
	) {
		super(reconcilerInstance, [])
		// @ts-expect-error client is AronaClient
		this.discordClient = interactionRef.client
		this.interactionRef = interactionRef
		this.messageRenderOptions = messageRenderOptions
		this.discordClient.addRoot(this)
	}

	override unmount() {
		super.unmount()
		this.#interactionListeners.clear()
		this.discordClient.removeRoot(this.uuid)
		this.#modalInteractionListener = null
		this.#unmountTimeout && clearTimeout(this.#unmountTimeout)
		if (this.#modalContainer) {
			this.reconcilerInstance.updateContainer(null, this.#modalContainer)
		}
	}

	interactionListener(interaction: Interaction) {
		if (this.unmounted || !this.message) return
		if (!("customId" in interaction)) return

		const listener = this.#interactionListeners.get(interaction.customId)
		listener?.(interaction)

		this.#modalInteractionListener?.(interaction)
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

		const messageContent = {
			components,
			files,
			...(isEmptyMessage ? { content: EMPTY_STRING } : {}),
		}

		this.#interactionListeners = new Map(interactionListeners)

		if (!this.message) {
			if (!this.waitForMessageCreation) {
				const createMessageAndHydrate = async () => {
					if (!this.interactionRef) throw new Error("No ref")

					let reply: Message | null | undefined = null

					if (this.interactionRef instanceof Message) {
						reply = await this.interactionRef.reply({
							...messageContent,
							flags: MESSAGE_FLAGS,
						})
					} else if (this.interactionRef instanceof BaseInteraction) {
						reply = await this.interactionRef
							.reply({
								...messageContent,
								ephemeral: this.messageRenderOptions?.ephemeral ?? false,
								withResponse: true,
								flags: MESSAGE_FLAGS,
							})
							.then((res) => res.resource?.message)
					} else {
						reply = await this.interactionRef.send({
							...messageContent,
							flags: MESSAGE_FLAGS,
						})
					}

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

		if (!this.message) throw new Error("No message to update")
		if (!this.message.editable) throw new Error("Message is not editable")

		if (this.messageRenderOptions?.ephemeral) {
			if (!(this.interactionRef instanceof BaseInteraction))
				throw new Error("Can't send ephemeral message to non-interaction")

			await this.interactionRef.editReply(messageContent)
		} else {
			await this.message.edit(messageContent)
		}
	}

	async renderModal(Code: ModalComponent, interaction: ModalInteractionRef) {
		this.#modalRoot ??= new AronaNode("arona:__modal-root", {}, this)
		this.#modalContainer ??= this.reconcilerInstance.createContainer(
			this.#modalRoot,
			1, // ConcurrentRoot
			null,
			false,
			false,
			"",
			(error) => {
				// console.trace("Error in modal", error)
			},
			null,
		)

		this.reconcilerInstance.updateContainer(
			<Code interaction={interaction} />,
			this.#modalContainer,
			null,
			() => {
				if (!this.#modalRoot) return
				const modalNode = this.#modalRoot.children[0]
				if (!modalNode) return
				this.handleModalRender(modalNode, interaction)
			},
		)
	}

	protected handleModalRender(
		modalNode: AronaNode,
		interaction: ModalInteractionRef,
	) {
		const modal = modalComponent.render(modalNode)
		this.#modalInteractionListener =
			modal.interactionListeners?.[0]?.[1] ?? null
		if (!modal.components[0]) return

		interaction.showModal(modal.components[0].toJSON())
	}
}
