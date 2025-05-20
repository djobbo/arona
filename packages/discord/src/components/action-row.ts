import {
	type AronaNode,
	defineComponent,
	renderComponentNodes,
} from "@arona/core"
import { ActionRowBuilder } from "discord.js"
import type { ReactNode } from "react"
import { buttonComponent } from "./button"

export interface ActionRowProps {
	children?: ReactNode
}

export const actionRowComponent = defineComponent({
	name: "arona:action-row",
	allowedChildren: [buttonComponent],
	render: (renderChildren) => (node: AronaNode<ActionRowProps>) => {
		const content = renderChildren(node.children)
		const actionRow = new ActionRowBuilder({
			components: content.flatMap(({ components }) => components),
		}).toJSON()

		return {
			components: [actionRow],
			listenerEntries: content.flatMap(
				({ listenerEntries }) => listenerEntries,
			),
		}
	},
})
