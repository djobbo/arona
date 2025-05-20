import type { AronaNode } from "../nodes/node"
import type { AronaComponent } from "./define-component"

const renderNode =
	<Props = unknown, RenderOutput extends object | null = null>(
		components: AronaComponent<Props, RenderOutput>[],
	) =>
	(node?: AronaNode | null) => {
		if (!node) return null

		for (const component of components) {
			if (component.guard(node)) {
				return component.render(node)
			}
		}

		throw new Error(
			`Unhandled element type: ${node.type} inside ${node.parent?.type}`,
		)
	}

export const renderComponentNodes =
	<Props = unknown, RenderOutput extends object | null = null>(
		components: AronaComponent<Props, RenderOutput>[],
	) =>
	(nodes: AronaNode | AronaNode[]) => {
		const nodesToRender = Array.isArray(nodes) ? nodes : [nodes]
		const render = renderNode(components)

		return nodesToRender.map(render).filter((output) => !!output)
	}
