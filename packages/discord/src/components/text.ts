import { type AronaNode, defineComponent, renderTextContent } from "@arona/core"
import { TextDisplayBuilder, type TextDisplayComponentData } from "discord.js"
import type { ReactNode } from "react"
import { EMPTY_STRING } from "../constants"
import type { AronaDiscordProps } from "./types"

export interface TextProps extends AronaDiscordProps<TextDisplayComponentData> {
	children?: ReactNode
}

export const textComponent = defineComponent({
	name: "arona:text",
	allowedChildren: [],
	render: () => (node: AronaNode<TextProps>) => {
		const textContent = renderTextContent(node)

		const { children: _children, ...props } = node.props

		const text = new TextDisplayBuilder({
			...props,
			content: textContent.length < 1 ? EMPTY_STRING : textContent,
		}).toJSON()

		return {
			components: [text],
		}
	},
})
