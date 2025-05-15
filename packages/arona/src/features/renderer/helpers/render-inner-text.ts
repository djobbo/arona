import { isTextNode } from "../nodes/text"
import type { AronaNode } from "../nodes/node"

export const renderInnerText = (
  node: AronaNode,
  textElementsOnly?: boolean,
): string => {
  if (isTextNode(node)) {
    return node.innerText
  }

  const innerText = node.children
    .map((child) => renderInnerText(child, true))
    .join("")

  if (!innerText) return ""

  switch (node.type) {
    case "arona:__text":
      return innerText
    case "reaccord:text-br":
      return "\n"
    case "reaccord:text-code":
      return `\`${innerText}\``
    case "reaccord:text-codeblock":
      return `\`\`\`${node.props.lang ?? ""}\n${innerText}\n\`\`\``
    case "reaccord:text-span":
      let str = innerText
      if (node.props.italic) str = `_${str}_`
      if (node.props.bold) str = `**${str}**`
      return str
    case "reaccord:text-link":
      return `[${innerText}](${node.props.href})`
    default:
      if (textElementsOnly)
        throw new Error(`Unexpected element type: ${node.type} inside Text`)
      return innerText
  }
}
