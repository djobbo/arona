import { type AronaNode, defineComponent } from "@arona/core"
import { SeparatorBuilder, type SeparatorComponentData } from "discord.js"
import type { AronaDiscordProps } from "./types"

export interface SeparatorProps
	extends AronaDiscordProps<SeparatorComponentData> {}

export const separatorComponent = defineComponent({
	name: "arona:separator",
	allowedChildren: [],
	render: () => (node: AronaNode<SeparatorProps>) => {
		const separator = new SeparatorBuilder({
			...node.props,
		})

		return {
			components: [separator],
		}
	},
})
