import {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { EMPTY_STRING } from "../../constants"
import { type FileAttachment } from "./components"
import { assertIsDefined } from "../../helpers/asserts"
import { renderNodes } from "./helpers/render-nodes"
import type { AronaNode } from "./nodes/node"
import type {
  FileAttachmentElements,
  ModalElements,
  // TextElements, // TODO: [NEXT] TextElements
} from "../jsx"
import type { Interaction, MessageActionRowComponentBuilder } from "discord.js"

export const renderFileAttachment = (
  node: AronaNode<FileAttachmentElements["file"]>,
): { file: FileAttachment } | null => {
  if ("file" in node.props) {
    if (!node.props.file) return null
    return { file: node.props.file }
  }

  if ("src" in node.props) {
    throw new Error(
      "Image with 'src' not yet supported at root level, use 'file' instead",
    )
  }

  return null
}

/**
 * @deprecated TODO: REMOVE THIS
 */
export const renderMessageContent = (root: AronaNode) => {
  const { components, files, interactionListeners } = renderNodes(root.children)
  const isEmptyMessage = components.length === 0

  return {
    messageContent: {
      components,
      files,
      ...(isEmptyMessage ? { content: EMPTY_STRING } : {}),
    },
    interactionListeners: new Map(interactionListeners),
  }
}

export const renderModalInput = (node: AronaNode<ModalElements["input"]>) => {
  const actionRow = new ActionRowBuilder<TextInputBuilder>()

  const { name, label, value, placeholder, required, paragraph, onChange } =
    node.props

  assertIsDefined(name, "Modal Input name is required")
  assertIsDefined(label, "Modal Input label is required")

  const textInput = new TextInputBuilder({
    customId: name,
    label: label,
    value: value,
    placeholder: placeholder,
    required: required,
    style: paragraph ? TextInputStyle.Paragraph : TextInputStyle.Short,
  })

  actionRow.addComponents(textInput)

  return { actionRow, name, onChange }
}
