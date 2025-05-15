import {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js"
import { EMPTY_STRING } from "../../constants"
import { type FileAttachment } from "./components"
import { assertIsDefined } from "../../helpers/asserts"
import { renderInnerText } from "./helpers/render-inner-text"
import { renderNodes } from "./helpers/render-nodes"
import type { AronaNode } from "./nodes/node"
import type {
  FileAttachmentElements,
  ModalElements,
  SelectMenuElements,
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

export const renderSelectMenuOption = (
  node: AronaNode<SelectMenuElements["option"]>,
) => {
  assertIsDefined(node.props.value, "SelectMenu option must have a value")

  return new StringSelectMenuOptionBuilder({
    default: node.props.selected ?? false,
    label: renderInnerText(node),
    value: node.props.value,
    description: node.props.description,
    emoji: node.props.emoji,
  })
}

export const renderSelectMenuRoot = (
  node: AronaNode<SelectMenuElements["root"]>,
) => {
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()

  const customId = node.props.customId ?? node.uuid

  const { disabled, placeholder } = node.props

  const selectMenu = new StringSelectMenuBuilder({
    customId,
    disabled: disabled ?? false,
    placeholder,
  })

  const options = node.children.map((option) => {
    if (option.type !== "reaccord:selectmenu-option") {
      throw new Error(
        `Unexpected element type: ${option.type} inside SelectMenu`,
      )
    }

    return renderSelectMenuOption(option)
  })

  selectMenu.addOptions(options)

  const listener = async (interaction: Interaction) => {
    // TODO: other types of select menus
    if (!interaction.isStringSelectMenu()) return
    if (interaction.customId !== customId) return

    if (!(await node.props.onChange?.(interaction.values, interaction))) {
      await interaction.deferUpdate()
    }
  }

  actionRow.addComponents(selectMenu)

  return { actionRow, customId, listener }
}

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

export const renderModalWrapper = (
  node: AronaNode<ModalElements["wrapper"]>,
) => {
  const { title } = node.props

  assertIsDefined(title, "Modal title is required")

  const customId = node.props.customId ?? node.uuid

  const modal = new ModalBuilder({
    customId,
    title,
  })

  const textInputs = node.children.map((child) => {
    if (child.type !== "reaccord:modal-input") {
      throw new Error(`Unexpected element type: ${child.type} inside Modal`)
    }

    return renderModalInput(child)
  })

  modal.addComponents(textInputs.map(({ actionRow }) => actionRow))

  const listener = async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return
    if (interaction.customId !== customId) return

    let props = new Map<string, string>()

    textInputs.map((input) => {
      const customId = input.name
      const value = interaction.fields.getTextInputValue(customId)
      input.onChange?.(value, interaction)
      props.set(input.name, value)
    })

    if (
      !(await node.props.onSubmit?.(Object.fromEntries(props), interaction))
    ) {
      await interaction.deferUpdate()
    }
  }

  return { modal, customId, listener }
}

export const renderModalRoot = (root: AronaNode) => {
  if (root.type !== "reaccord:__modal-root")
    throw new Error("Invalid modal root")

  const modalNode = root.firstChild

  if (
    root.children.length !== 1 ||
    !modalNode ||
    modalNode.type !== "reaccord:modal-wrapper"
  )
    throw new Error(
      "When creating a modal, make sure you wrap all the children inside a single <Modal> element",
    )

  return renderModalWrapper(modalNode)
}
