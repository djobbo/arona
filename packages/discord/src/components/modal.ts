import { type AronaNode, defineComponent, useRootNode } from "@arona/core"
import {
	ActionRowBuilder,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js"
import type {
	AutocompleteInteraction,
	Interaction,
	ModalComponentData,
	ModalSubmitInteraction,
	TextInputComponentData,
} from "discord.js"
import type { ReactNode } from "react"
import type { DiscordRootNode } from "../discord-root-node"
import type { AronaDiscordProps } from "./types"

export type ModalInteractionRef = Exclude<
	Interaction,
	AutocompleteInteraction | ModalSubmitInteraction
>

export type ModalComponent = ({
	interaction,
}: {
	interaction: ModalInteractionRef
}) => JSX.Element

export const useModal = () => {
	const rootNode = useRootNode() as DiscordRootNode

	return {
		openModal: (Code: ModalComponent) => (interaction: ModalInteractionRef) => {
			rootNode.renderModal(Code, interaction)
			// Prevent interaction from being deferred
			return true
		},
	}
}

export interface TextInputProps
	extends Omit<
		AronaDiscordProps<TextInputComponentData>,
		"customId" | "style"
	> {
	/**
	 * @deprecated Custom IDs are not recommended unless you know what you're doing.
	 * They are used to identify the text input in each interaction.
	 * If set manually, it should be unique per text input, and per interaction.
	 */
	customId?: ModalComponentData["customId"]
	name: string
	onChange?: (value: string, interaction: Interaction) => unknown
	required?: boolean
	style?: TextInputComponentData["style"]
}

export const textInputComponent = defineComponent({
	name: "arona:text-input",
	allowedChildren: [],
	render: () => (node: AronaNode<TextInputProps>) => {
		const {
			customId = node.uuid,
			value,
			required = false,
			name,
			onChange,
			style = TextInputStyle.Short,
			...props
		} = node.props

		const textInput = new TextInputBuilder({
			customId,
			...(value ? { value } : void 0),
			required,
			style,
			...props,
		})

		// TODO: check if inside action row
		const actionRow = new ActionRowBuilder<TextInputBuilder>({
			components: [textInput],
		})

		return {
			component: actionRow,
			customId,
			name,
			onChange,
		}
	},
})

export interface ModalProps
	extends Omit<ModalComponentData, "customId" | "components"> {
	/**
	 * @deprecated Custom IDs are not recommended unless you know what you're doing.
	 * They are used to identify the modal in each interaction.
	 * If set manually, it should be unique per modal, and per interaction.
	 */
	customId?: ModalComponentData["customId"]
	onSubmit?: (
		values: Record<string, string>,
		interaction: Interaction,
	) => unknown
	children?: ReactNode
}

export const modalComponent = defineComponent({
	name: "arona:modal",
	allowedChildren: [textInputComponent],
	render: (renderChildren) => (node: AronaNode<ModalProps>) => {
		const textInputs = renderChildren(node.children)

		const {
			customId = node.uuid,
			children: _children,
			onSubmit,
			...props
		} = node.props

		const modal = new ModalBuilder({
			customId,
			...props,
			components: textInputs.map(({ component }) => component),
		})

		const listener = async (interaction: Interaction) => {
			if (!interaction.isModalSubmit()) return
			if (interaction.customId !== customId) return

			const props = new Map<string, string>()

			textInputs.map((input) => {
				const value = interaction.fields.getTextInputValue(input.customId)
				input.onChange?.(value, interaction)

				if (!input.name) return
				props.set(input.name, value)
			})

			if (
				!(await node.props.onSubmit?.(Object.fromEntries(props), interaction))
			) {
				await interaction.deferUpdate()
			}
		}

		const interactionListeners = [[customId, listener]] as const

		return {
			components: [modal],
			files: [],
			interactionListeners,
		}
	},
})
