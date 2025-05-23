import type { AronaNode } from "../nodes/node"
import type { AronaComponent } from "./define-component"

const renderNode =
	// biome-ignore lint/suspicious/noExplicitAny: we need to allow any here
	<Components extends AronaComponent<any, any>[]>(components: Components) => {
		return (
			node?: AronaNode | null,
		): NonNullable<
			// biome-ignore lint/suspicious/noExplicitAny: we need to allow any here
			Components[number] extends AronaComponent<any, infer Output>
				? Output
				: never
		> | null => {
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
	}

export const renderComponentNodes =
	// biome-ignore lint/suspicious/noExplicitAny: we need to allow any here
	<Components extends AronaComponent<any, any>[]>(components: Components) => {
		return (nodes: AronaNode | AronaNode[]) => {
			const nodesToRender = Array.isArray(nodes) ? nodes : [nodes]
			const render = renderNode(components)

			return nodesToRender
				.map(render)
				.filter((output): output is NonNullable<typeof output> => !!output)
		}
	}
