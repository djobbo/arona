import type { FiberRoot, Reconciler } from "react-reconciler"
import { debounce } from "../../helpers/debounce"
import type { AronaComponent } from "../helpers/define-component"
import { RootNodeProvider } from "../root-node-provider"
import { AronaNode } from "./node"
import type { AronaTextNode } from "./text"

const ROOT_NODE_UPDATE_DEBOUNCE_MS = 50

export class AronaRootNode<
	Props = unknown,
	RenderOutput extends object | null = null,
> extends AronaNode {
	reconcilerInstance: Reconciler<
		AronaNode,
		AronaNode,
		AronaTextNode,
		unknown,
		unknown
	>
	#rootContainer: FiberRoot
	#unmountTimeout: Timer | null = null
	unmounted = false

	constructor(
		reconcilerInstance: Reconciler<
			AronaNode,
			AronaNode,
			AronaTextNode,
			unknown,
			unknown
		>,
		components: AronaComponent<Props, RenderOutput>[],
	) {
		super("arona:__root")
		this.reconcilerInstance = reconcilerInstance
		this.#rootContainer = this.reconcilerInstance.createContainer(
			this,
			1, // ConcurrentRoot
			null,
			false,
			false,
			"",
			(error) => {
				// console.trace("Error in root", error)
			},
			null,
		)
	}

	unmount() {
		this.unmounted = true
		this.#unmountTimeout && clearTimeout(this.#unmountTimeout)
		this.reconcilerInstance.updateContainer(null, this.#rootContainer)
	}

	async initialRender(Code: () => JSX.Element) {
		this.reconcilerInstance.updateContainer(
			<RootNodeProvider<Props, RenderOutput> rootNode={this}>
				<Code />
			</RootNodeProvider>,
			this.#rootContainer,
		)

		await this.render()
	}

	render = debounce(async () => {
		if (this.unmounted) return
		await this.performRender()
	}, ROOT_NODE_UPDATE_DEBOUNCE_MS)

	protected async performRender() {
		// To be implemented by subclasses
		throw new Error("performRender must be implemented by subclass")
	}
}

export const isRootNode = (node?: AronaNode | null): node is AronaRootNode => {
	return node?.type === "arona:__root"
}
