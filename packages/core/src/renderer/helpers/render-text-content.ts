import type { AronaNode } from "../nodes/node"
import { isTextNode } from "../nodes/text"

export const renderTextContent = (
	node: AronaNode,
	textElementsOnly?: boolean,
): string => {
	if (isTextNode(node)) {
		return node.innerText
	}

	const innerText = node.children
		.map((child) => renderTextContent(child, true))
		.join("")

	if (!innerText) return ""

	switch (node.type) {
		case "arona:__text":
			return innerText
		default:
			if (textElementsOnly)
				throw new Error(`Unexpected element type: ${node.type} inside Text`)
			return innerText
	}
}
