import { type AronaNode, defineComponent } from "@arona/core"
import type { ReactNode } from 'react'

export interface CodeProps {
	lang: string
	children: ReactNode
}

export const codeComponent = defineComponent({
	name: "arona:code",
	allowedChildren: [],
	render: () => (node: AronaNode<CodeProps>) => {
		const { lang, children, ...props } = node.props
        
		if (!lang) {
			console.warn(`Code ${node.uuid} has no language. It will not be rendered.`)
			return null
		}

		return {content:`\`\`\`${lang}\n${children}\`\`\``}
	},
})
