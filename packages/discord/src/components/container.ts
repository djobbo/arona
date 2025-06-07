import { type AronaNode, defineComponent } from "@arona/core"
import {
	type APIContainerComponent,
	type ColorResolvable,
	ContainerBuilder,
	resolveColor,
} from "discord.js"
import type { ReactNode } from "react"
import { topLevelComponents } from "./helpers/top-level-components"
import type { AronaDiscordProps } from "./types"

export interface ContainerProps
	extends Omit<
		AronaDiscordProps<APIContainerComponent>,
		"accent_color" | "components"
	> {
	accentColor?: ColorResolvable
	children?: ReactNode
}

export const containerComponent = defineComponent({
	name: "arona:container",
	allowedChildren: topLevelComponents,
	render: (renderChildren) => (node: AronaNode<ContainerProps>) => {
		const content = renderChildren(node.children)
		const container = new ContainerBuilder({
			// @ts-ignore
			components: content.flatMap((component) => component.components),
			accent_color: node.props.accentColor
				? resolveColor(node.props.accentColor)
				: undefined,
			spoiler: node.props.spoiler,
		})

		return {
			components: [container],
			listenerEntries: content
				.flatMap((component) =>
					"listenerEntries" in component ? component.listenerEntries : [],
				)
				.filter(Boolean),
			files: content.flatMap((component) =>
				"files" in component ? component.files : [],
			),
		}
	},
})
