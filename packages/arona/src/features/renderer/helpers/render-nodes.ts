import { TextDisplayBuilder } from "discord.js"
import {
  isActionRowComponent,
  isButtonComponent,
  isContainerComponent,
  isLinkButtonComponent,
  isSectionAccessoryComponent,
  isSectionComponent,
  isSeparatorComponent,
  isTextComponent,
  renderActionRowComponent,
  renderButtonComponent,
  renderContainerComponent,
  renderLinkButtonComponent,
  renderSectionAccessoryComponent,
  renderSectionComponent,
  renderSeparatorComponent,
  renderTextComponent,
} from "../components"
import type {
  APIMessageComponent,
  Interaction,
  JSONEncodable,
} from "discord.js"
import type { AronaNode } from "../nodes/node"
import type { FileAttachment } from "../components"

const renderNode = (
  node?: AronaNode | null,
): {
  components: JSONEncodable<APIMessageComponent>[]
  files: FileAttachment[]
  interactionListeners: [string, (interaction: Interaction) => unknown][]
} => {
  if (!node) {
    return {
      components: [],
      files: [],
      interactionListeners: [],
    }
  }

  switch (true) {
    case isActionRowComponent(node):
      return renderActionRowComponent(node)
    case isButtonComponent(node):
      return renderButtonComponent(node)
    case isContainerComponent(node):
      return renderContainerComponent(node)
    case isLinkButtonComponent(node):
      return renderLinkButtonComponent(node)
    case isSectionComponent(node):
      return renderSectionComponent(node)
    case isSectionAccessoryComponent(node):
      return renderSectionAccessoryComponent(node)
    case isSeparatorComponent(node):
      return renderSeparatorComponent(node)
    case isTextComponent(node):
      return renderTextComponent(node)
    default:
      throw new Error(
        `Unhandled element type: ${node.type} inside ${node.parent?.type}`,
      )
  }
}

export const renderNodes = (
  nodes: AronaNode | AronaNode[],
): {
  components: JSONEncodable<APIMessageComponent>[]
  files: FileAttachment[]
  interactionListeners: [string, (interaction: Interaction) => unknown][]
} => {
  const components: JSONEncodable<APIMessageComponent>[] = []
  const files: FileAttachment[] = []
  const interactionListeners: [
    string,
    (interaction: Interaction) => unknown,
  ][] = []

  const nodesToRender = Array.isArray(nodes) ? nodes : [nodes]

  nodesToRender.forEach((node) => {
    const content = renderNode(node)

    components.push(...(content.components ?? []))
    files.push(...(content.files ?? []))
    interactionListeners.push(...(content.interactionListeners ?? []))
  })
  return { components, files, interactionListeners }
}
