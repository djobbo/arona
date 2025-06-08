import { type AronaNode, defineComponent, renderTextContent } from "@arona/core"
import type {
	MrkdwnElement,
	PlainTextElement,
	SectionBlock,
} from "@slack/web-api"
import type { ReactNode } from "react"
import type { AronaSlackProps } from "../types"

export interface TextProps
	extends Omit<AronaSlackProps<PlainTextElement>, "text"> {
	children: ReactNode
}

const renderBaseText = (node: AronaNode<TextProps>) => {
	const { children: _children, ...props } = node.props
	const textContent = renderTextContent(node)

	const text: PlainTextElement = {
		type: "plain_text",
		text: textContent,
		...props,
	}

	return text
}

export const textComponent = defineComponent({
	name: "arona:slack:text",
	allowedChildren: [],
	render: () => (node: AronaNode<TextProps>) => {
		const text = renderBaseText(node)

		return {
			components: [text],
		}
	},
})

export const textWithSectionComponent = defineComponent({
	name: textComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<TextProps>) => {
		const text = renderBaseText(node)
		const sectionBlock: SectionBlock = {
			type: "section",
			block_id: node.uuid,
			text: text,
		}

		return {
			components: [sectionBlock],
		}
	},
})

export interface MarkdownProps
	extends Omit<AronaSlackProps<MrkdwnElement>, "text"> {
	children: ReactNode
}

const renderBaseMarkdown = (node: AronaNode<MarkdownProps>) => {
	const { children: _children, ...props } = node.props
	const textContent = renderTextContent(node)

	const markdown: MrkdwnElement = {
		type: "mrkdwn",
		text: textContent,
		...props,
	}

	return markdown
}

export const markdownComponent = defineComponent({
	name: "arona:slack:markdown",
	allowedChildren: [],
	render: () => (node: AronaNode<MarkdownProps>) => {
		const markdown = renderBaseMarkdown(node)

		return {
			components: [markdown],
		}
	},
})

export const markdownWithSectionComponent = defineComponent({
	name: markdownComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<MarkdownProps>) => {
		const markdown = renderBaseMarkdown(node)
		const sectionBlock: SectionBlock = {
			type: "section",
			block_id: node.uuid,
			text: markdown,
		}

		return {
			components: [sectionBlock],
		}
	},
})
