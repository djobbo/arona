import { type AronaNode, defineComponent, renderTextContent } from "@arona/core"
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	type LinkButtonComponentData,
	type MessageActionRowComponentBuilder,
} from "discord.js"
import type { ReactNode } from "react"
import type { AronaDiscordProps } from './types'

export interface LinkButtonProps
	extends Omit<AronaDiscordProps<LinkButtonComponentData>, "style"> {
	children?: ReactNode
}

const renderBaseLinkButton = (node: AronaNode<LinkButtonProps>) => {
	const linkButton = new ButtonBuilder({
		disabled: node.props.disabled ?? false,
		label: renderTextContent(node),
		style: ButtonStyle.Link,
		url: node.props.url,
	})

	return {
		component: linkButton,
	}
}

export const linkButtonComponent = defineComponent({
	name: "arona:link-button",
	allowedChildren: [],
	render: () => (node: AronaNode<LinkButtonProps>) => {
		const { component } = renderBaseLinkButton(node)
		return {
			components: [component],
		}
	},
})

export const linkButtonWithActionRowComponent = defineComponent({
	name: linkButtonComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<LinkButtonProps>) => {
		const { component } = renderBaseLinkButton(node)
		const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>({
			components: [component],
		})

		return {
			components: [actionRow],
		}
	},
})
