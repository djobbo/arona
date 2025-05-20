import type { FC } from "react"
import type { AronaNode } from "../nodes/node"
import { renderComponentNodes } from "./render-nodes"

export type AronaComponent<
	Props = unknown,
	RenderOutput extends object | null = null,
> = {
	name: string
	component: FC<Props>
	render: (node: AronaNode<Props>) => RenderOutput
	guard: (node?: AronaNode | null) => node is AronaNode<Props>
}
export const defineComponent = <
	Props = unknown,
	RenderOutput extends object | null = null,
	AllowedChildren extends AronaComponent<any, any>[] = AronaComponent<
		any,
		any
	>[],
>({
	name,
	allowedChildren,
	render,
}: {
	name: string
	allowedChildren: AllowedChildren
	render: (
		renderChildren: (
			nodes: AronaNode | AronaNode[],
		) => NonNullable<
			AllowedChildren[number] extends AronaComponent<any, infer R> ? R : never
		>[],
	) => (node: AronaNode<Props>) => RenderOutput
}): AronaComponent<Props, RenderOutput> => {
	const renderChildren = renderComponentNodes(allowedChildren)

	return {
		name,
		component: name as unknown as FC<Props>,
		render: render(renderChildren),
		guard: (node): node is AronaNode<Props> => {
			return node?.type === name
		},
	}
}
