import { createContext, useContext } from "react"
import type { AronaRootNode } from "./nodes/root"

const rootNodeContext = createContext<AronaRootNode | null>(null)

export const useRootNode = <
	Props = unknown,
	RenderOutput extends object | null = null,
>() => {
	const rootNode = useContext(rootNodeContext) as AronaRootNode<
		Props,
		RenderOutput
	> | null

	if (!rootNode) {
		throw new Error("useRootNode must be used inside a RootNodeProvider")
	}

	return rootNode
}

export type MessageProviderProps<
	Props = unknown,
	RenderOutput extends object | null = null,
> = {
	rootNode: AronaRootNode<Props, RenderOutput>
	children?: JSX.Element
}

export const RootNodeProvider = <
	Props = unknown,
	RenderOutput extends object | null = null,
>({
	rootNode,
	children,
}: MessageProviderProps<Props, RenderOutput>) => {
	return (
		<rootNodeContext.Provider value={rootNode}>
			{children}
		</rootNodeContext.Provider>
	)
}
