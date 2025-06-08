import { type AronaNode, defineComponent } from "@arona/core"
import type { DividerBlock } from "@slack/web-api"
import type { AronaSlackProps } from "../types"

export interface DividerProps extends AronaSlackProps<DividerBlock> {}

export const dividerComponent = defineComponent({
	name: "arona:slack:divider",
	allowedChildren: [],
	render: () => (node: AronaNode<DividerProps>) => {
		const divider: DividerBlock = {
			type: "divider",
			block_id: node.uuid,
			...node.props,
		}

		return {
			components: [divider],
		}
	},
})
