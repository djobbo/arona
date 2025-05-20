import { type AronaNode, defineComponent } from "@arona/core"
import { ThumbnailBuilder, type ThumbnailComponentData } from "discord.js"
import type { InteractionListenerEntry } from "../types"
import type { AronaDiscordProps } from "./types"

export interface ThumbnailProps
	extends AronaDiscordProps<ThumbnailComponentData> {}

export const thumbnailComponent = defineComponent({
	name: "arona:thumbnail",
	allowedChildren: [],
	render: () => (node: AronaNode<ThumbnailProps>) => {
		const thumbnail = new ThumbnailBuilder({
			...node.props,
		})

		return {
			components: [thumbnail],
			listenerEntries: [] as InteractionListenerEntry[],
		}
	},
})
