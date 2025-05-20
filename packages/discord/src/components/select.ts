import {
	type AronaNode,
	defineComponent,
	isRootNode,
	renderTextContent,
} from "@arona/core"
import {
	ActionRowBuilder,
	type Interaction,
	type MessageActionRowComponentBuilder,
	type SelectMenuComponentOptionData,
	StringSelectMenuBuilder,
	type StringSelectMenuComponentData,
	type StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
} from "discord.js"
import type { ReactNode } from "react"
import type { AronaDiscordProps } from "./types"

export interface OptionProps
	extends Omit<
		AronaDiscordProps<SelectMenuComponentOptionData>,
		"default" | "label"
	> {
	selected?: boolean
	children?: ReactNode
}

export const optionComponent = defineComponent({
	name: "arona:select-menu-option",
	allowedChildren: [],
	render: () => (node: AronaNode<OptionProps>) => {
		const {
			children: _children,
			value,
			selected = false,
			...props
		} = node.props

		if (!value) {
			return null
		}

		const option = new StringSelectMenuOptionBuilder({
			default: selected,
			label: renderTextContent(node) ?? node.props.value,
			value,
			...props,
		}).toJSON()

		return {
			component: option,
		}
	},
})

export interface SelectProps
	extends Omit<
		AronaDiscordProps<StringSelectMenuComponentData>,
		"customId" | "options"
	> {
	/**
	 * @deprecated Custom IDs are not recommended unless you know what you're doing.
	 * They are used to identify the select-menu in each interaction.
	 * If set manually, it should be unique per select-menu, and per interaction.
	 */
	customId?: StringSelectMenuComponentData["customId"]
	/**
	 * By default, onChange will trigger a defered update automatically.
	 * If you want to handle the update manually, return a truthy value.
	 * This can be usefull if the interaction needs to be kept alive for a relatively long time
	 * (Discord will timeout the interaction after 3 seconds).
	 * @example
	 * <Select onChange={async (interaction) => {
	 *  interaction.deferUpdate()
	 *  // do some async stuff that takes more than 3 seconds
	 *  await new Promise((resolve) => setTimeout(resolve, 5000))
	 *  // return true to prevent the automatic update
	 *  return true
	 * }}>...</Select>
	 */
	onChange?: (
		values: string[],
		interaction: StringSelectMenuInteraction,
	) => unknown | Promise<unknown>
	children?: ReactNode
}

const renderBaseSelect = (
	node: AronaNode<SelectProps>,
	renderChildren: (
		nodes: AronaNode | AronaNode[],
	) => ReturnType<typeof optionComponent.render>[],
) => {
	const options = renderChildren(node.children).filter((option) => !!option)

	if (options.length === 0) {
		console.warn(
			`Select menu ${node.uuid} has no options. It will not be rendered.`,
		)

		return null
	}

	const {
		children: _children,
		customId = node.uuid,
		onChange,
		disabled = false,
		...props
	} = node.props

	const select = new StringSelectMenuBuilder({
		customId,
		options: options.map(({ component }) => component),
		disabled,
		...props,
	})

	const listener = async (interaction: Interaction) => {
		if (!interaction.isStringSelectMenu()) return
		if (interaction.customId !== customId) return

		if (!(await onChange?.(interaction.values, interaction))) {
			await interaction.deferUpdate()
		}
	}

	const listenerEntry = [customId, listener]

	return {
		component: select,
		listenerEntry,
	}
}

export const selectComponent = defineComponent({
	name: "arona:select-string",
	allowedChildren: [optionComponent],
	render: (renderChildren) => (node: AronaNode<SelectProps>) => {
		const baseSelect = renderBaseSelect(node, renderChildren)
		if (!baseSelect) return null

		const { component, listenerEntry } = baseSelect
		return {
			components: [component],
			listenerEntries: [listenerEntry],
		}
	},
})

export const selectWithActionRowComponent = defineComponent({
	name: "arona:select-string",
	allowedChildren: [optionComponent],
	render: (renderChildren) => (node: AronaNode<SelectProps>) => {
		const baseSelect = renderBaseSelect(node, renderChildren)
		if (!baseSelect) return null

		const { component, listenerEntry } = baseSelect
		const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>({
			components: [component],
		})

		return {
			components: [actionRow],
			listenerEntries: [listenerEntry],
		}
	},
})
