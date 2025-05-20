import createReconciler, { type Reconciler } from "react-reconciler"
import { hostConfig } from "./host-config"
import type { AronaNode } from "./nodes/node"
import type { AronaRootNode } from "./nodes/root"
import type { AronaTextNode } from "./nodes/text"

export type ReconcilerInstance = Reconciler<
	AronaNode,
	AronaNode,
	AronaTextNode,
	unknown,
	unknown
>

export const createRenderer = <RootNode extends AronaRootNode, Props>(
	createRootNode: (
		reconcilerInstance: ReconcilerInstance,
		props: Props,
	) => RootNode,
) => {
	const reactReconcilerInstance = createReconciler(hostConfig)
	reactReconcilerInstance.injectIntoDevTools({
		bundleType: process.env.NODE_ENV === "development" ? 1 : 0,
		rendererPackageName: "arona",
		version: "0.0.0",
	})

	return async (Code: () => JSX.Element, props: Props) => {
		const rootNode = createRootNode(reactReconcilerInstance, props)
		await rootNode.initialRender(Code)
		return rootNode
	}
}
