import { App, type AppOptions } from '@slack/bolt';
import type { SlackRootNode } from "./slack-root-node"

export class SlackClient extends App {
    #interactionRoots = new Map<string, SlackRootNode>()

	constructor(options: AppOptions) {
		console.log("🌱 Initializing Arona...")
		super(options)
	}

	async destroy() {
		for (const root of this.#interactionRoots.values()) {
			root.unmount()
		}
		this.#interactionRoots.clear()
		super.stop()
	}

	addRoot(root: SlackRootNode) {
		this.#interactionRoots.set(root.uuid, root)
		return this
	}
    
	removeRoot(uuid: string) {
		this.#interactionRoots.delete(uuid)
		return this
	}
}
