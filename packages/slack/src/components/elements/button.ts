import { type AronaNode, defineComponent, renderTextContent } from "@arona/core"
import type { ActionsBlock, Button } from "@slack/web-api"
import type { ReactNode } from "react"
import type { InteractionListener, InteractionListenerEntry } from "../../types"
import type { AronaSlackProps } from "../types"

export interface ButtonProps extends Omit<AronaSlackProps<Button>, "text"> {
	/**
	 * @deprecated Action IDs are not recommended unless you know what you're doing.
	 * They are used to identify the button in each interaction.
	 * If set manually, it should be unique per button, and per interaction.
	 */
	actionId?: string
	children: ReactNode
	/**
	 * By default, onClick will acknowledge the interaction automatically.
	 * If you want to handle the update manually, return a truthy value.
	 * This can be usefull if the interaction needs to be kept alive for a relatively long time
	 * (Slack will timeout the interaction after a few seconds).
	 * @example
	 * <Button onClick={async (interaction) => {
	 *  interaction.ack()
	 *  // do some async stuff that takes more than 3 seconds
	 *  await new Promise((resolve) => setTimeout(resolve, 5000))
	 *  // return true to prevent the automatic acknowledgement
	 *  return true
	 * }}>...</Button>
	 */
	onClick?: InteractionListener
}

const renderBaseButton = (node: AronaNode<ButtonProps>) => {
	const {
		actionId = node.uuid,
		children: _children,
		onClick,
		...props
	} = node.props

	const button: Button = {
		type: "button",
		text: {
			type: "plain_text",
			text: renderTextContent(node),
		},
		action_id: actionId,
		...props,
	}

	const listener: InteractionListener = async (payload) => {
		if (!(await onClick?.(payload))) {
			await payload.ack()
		}
	}

	const listenerEntry: InteractionListenerEntry = [actionId, listener]

	return {
		component: button,
		listenerEntry,
	}
}

export const buttonComponent = defineComponent({
	name: "arona:slack:button",
	allowedChildren: [],
	render: () => (node: AronaNode<ButtonProps>) => {
		const { component, listenerEntry } = renderBaseButton(node)

		return {
			components: [component],
			listenerEntries: [listenerEntry],
		}
	},
})

export const buttonWithActionBlockComponent = defineComponent({
	name: buttonComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<ButtonProps>) => {
		const { component, listenerEntry } = renderBaseButton(node)
		const actionsBlock: ActionsBlock = {
			type: "actions",
			block_id: node.uuid,
			elements: [component],
		}

		return {
			components: [actionsBlock],
			listenerEntries: [listenerEntry],
		}
	},
})
