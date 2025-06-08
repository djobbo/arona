import { App, type AppOptions } from "@slack/bolt"
import type { SlackRootNode } from "./slack-root-node"
import type { InteractionListener } from "./types"

export class SlackClient extends App {
	#interactionRoots = new Map<string, SlackRootNode>()

	constructor(options: AppOptions) {
		console.log("🌱 Initializing Arona...")
		super(options)
		super.action(/^.*$/g, this.globalInteractionListener)
	}
	async destroy() {
		for (const root of this.#interactionRoots.values()) {
			root.unmount()
		}
		this.#interactionRoots.clear()
		super.stop()
	}

	globalInteractionListener: InteractionListener = async (payload) => {
		for (const root of this.#interactionRoots.values()) {
			root.interactionListener(payload)
		}
	}

	addRoot(root: SlackRootNode) {
		this.#interactionRoots.set(root.uuid, root)
		return this
	}

	removeRoot(uuid: string) {
		this.#interactionRoots.delete(uuid)
		return this
	}

	override message(...args: Parameters<typeof App.prototype.message>) {
		return super.message(
			...args.map((arg) => {
				if (typeof arg !== "function") return arg
				return async (payload: Parameters<typeof arg>[0]) => {
					await arg({
						...payload,
						message: {
							...payload.message,
							// TODO: make this type safe for the end user
							// @ts-expect-error - internal context property
							arona: { client: this },
						},
					})
				}
			}),
		)
	}
}
