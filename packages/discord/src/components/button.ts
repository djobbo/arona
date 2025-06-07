import { type AronaNode, defineComponent, renderTextContent } from "@arona/core"
import {
	ActionRowBuilder,
	ButtonBuilder,
	type ButtonInteraction,
	ButtonStyle,
	type Interaction,
	type InteractionButtonComponentData,
	type MessageActionRowComponentBuilder,
} from "discord.js"
import type { ReactNode } from "react"
import type { InteractionListenerEntry } from "../types"

export interface ButtonProps extends Partial<InteractionButtonComponentData> {
	/**
	 * @deprecated Custom IDs are not recommended unless you know what you're doing.
	 * They are used to identify the button in each interaction.
	 * If set manually, it should be unique per button, and per interaction.
	 */
	customId?: InteractionButtonComponentData["customId"]
	/**
	 * By default, onClick will trigger a defered update automatically.
	 * If you want to handle the update manually, return a truthy value.
	 * This can be usefull if the interaction needs to be kept alive for a relatively long time
	 * (Discord will timeout the interaction after 3 seconds).
	 * @example
	 * <Button onClick={async (interaction) => {
	 *  interaction.deferUpdate()
	 *  // do some async stuff that takes more than 3 seconds
	 *  await new Promise((resolve) => setTimeout(resolve, 5000))
	 *  // return true to prevent the automatic update
	 *  return true
	 * }}>...</Button>
	 */
	onClick?: (interaction: ButtonInteraction) => unknown | Promise<unknown>
	style?: Exclude<InteractionButtonComponentData["style"], ButtonStyle.Link>
	children: ReactNode
}

const renderBaseButton = (node: AronaNode<ButtonProps>) => {
	const {
		children: _children,
		customId = node.uuid,
		onClick,
		disabled = false,
		style = ButtonStyle.Secondary,
		...props
	} = node.props

	const button = new ButtonBuilder({
		customId,
		disabled,
		style,
		...props,
		label: renderTextContent(node),
	})

	const listener = async (interaction: Interaction) => {
		if (!interaction.isButton()) return
		if (interaction.customId !== customId) return

		if (!(await onClick?.(interaction))) {
			await interaction.deferUpdate()
		}
	}

	const listenerEntry: InteractionListenerEntry = [customId, listener]

	return {
		component: button,
		listenerEntry,
	}
}

export const buttonComponent = defineComponent({
	name: "arona:button",
	allowedChildren: [],
	render: () => (node: AronaNode<ButtonProps>) => {
		const { component, listenerEntry } = renderBaseButton(node)

		return {
			components: [component],
			listenerEntries: [listenerEntry],
		}
	},
})

export const buttonWithActionRowComponent = defineComponent({
	name: buttonComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<ButtonProps>) => {
		const { component, listenerEntry } = renderBaseButton(node)
		const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>({
			components: [component],
		})

		return {
			components: [actionRow],
			listenerEntries: [listenerEntry],
		}
	},
})
