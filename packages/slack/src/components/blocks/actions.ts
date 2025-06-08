import { type AronaNode, defineComponent } from "@arona/core"
import type { ActionsBlock } from "@slack/web-api"
import type { ReactNode } from "react"
import { buttonComponent } from "../elements/button"
import type { AronaSlackProps } from "../types"

export interface ActionsProps
	extends Omit<AronaSlackProps<ActionsBlock>, "elements"> {
	children: ReactNode
}

export const actionsComponent = defineComponent({
	name: "arona:slack:actions",
	allowedChildren: [buttonComponent],
	render: (renderChildren) => (node: AronaNode<ActionsProps>) => {
		const content = renderChildren(node.children)
		const { children: _children, ...props } = node.props
		const actions: ActionsBlock = {
			type: "actions",
			block_id: node.uuid,
			elements: content.flatMap(({ components }) => components),
			...props,
		}

		return {
			components: [actions],
			listenerEntries: content
				.map(({ listenerEntries }) => listenerEntries)
				.flat(),
		}
	},
})
