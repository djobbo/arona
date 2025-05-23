import type { AronaNode } from "../nodes/node"
import type { AronaComponent } from "./define-component"

const renderNode =
	<Components extends AronaComponent<any, any>[]>(
		components: Components,
	) =>
	(node?: AronaNode | null): NonNullable<Components[number] extends AronaComponent<any, infer Output> ? Output : never> | null => {
		if (!node) return null

		for (const component of components) {
			if (component.guard(node)) {
				return component.render(node)
			}
		}

		// TODO: add a callback to the renderer to handle unhandled nodes
		throw new Error(
			`Unhandled element type: ${node.type} inside ${node.parent?.type}`,
		)
	}

export const renderComponentNodes =
	<Components extends AronaComponent<any, any>[]>(
		components: Components,
	) =>
	(nodes: AronaNode | AronaNode[]) => {
		const nodesToRender = Array.isArray(nodes) ? nodes : [nodes]
		const render = renderNode(components)

		return nodesToRender.map(render).filter((output): output is NonNullable<typeof output> => !!output)
	}
