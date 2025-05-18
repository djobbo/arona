import {
  isActionRowComponent,
  isButtonComponent,
  isContainerComponent,
  isGalleryComponent,
  isLinkButtonComponent,
  isMediaComponent,
  isSectionAccessoryComponent,
  isSectionComponent,
  isSelectComponent,
  isSeparatorComponent,
  isTextComponent,
  isThumbnailComponent,
  renderActionRowComponent,
  renderButtonComponent,
  renderContainerComponent,
  renderGalleryComponent,
  renderLinkButtonComponent,
  renderMediaComponent,
  renderSectionAccessoryComponent,
  renderSectionComponent,
  renderSelectComponent,
  renderSeparatorComponent,
  renderTextComponent,
  renderThumbnailComponent,
} from "../components"
import type { AronaNode } from "../nodes/node"
import type { RenderOutput } from "./define-component"

const renderNode = (node?: AronaNode | null): RenderOutput => {
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
    case isGalleryComponent(node):
      return renderGalleryComponent(node)
    case isMediaComponent(node):
      return renderMediaComponent(node)
    case isSectionComponent(node):
      return renderSectionComponent(node)
    case isSectionAccessoryComponent(node):
      return renderSectionAccessoryComponent(node)
    case isSelectComponent(node):
      return renderSelectComponent(node)
    case isSeparatorComponent(node):
      return renderSeparatorComponent(node)
    case isTextComponent(node):
      return renderTextComponent(node)
    case isThumbnailComponent(node):
      return renderThumbnailComponent(node)
    default:
      throw new Error(
        `Unhandled element type: ${node.type} inside ${node.parent?.type}`,
      )
  }
}

export const renderNodes = (nodes: AronaNode | AronaNode[]): RenderOutput => {
  const output: RenderOutput = {
    components: [],
    files: [],
    interactionListeners: [],
  }

  const nodesToRender = Array.isArray(nodes) ? nodes : [nodes]

  nodesToRender.forEach((node) => {
    const content = renderNode(node)

    output.components.push(...(content.components ?? []))
    output.files.push(...(content.files ?? []))
    output.interactionListeners.push(...(content.interactionListeners ?? []))
  })

  return output
}
