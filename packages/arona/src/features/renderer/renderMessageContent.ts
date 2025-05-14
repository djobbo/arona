import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  ModalBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  resolveColor,
} from "discord.js"
import { type FileAttachment, isActionRow } from "./components"
import { assertIsDefined } from "../../helpers/asserts"
import { getFileFromAttachment } from "../../helpers/get-file-from-attachment"
import { isRootNode } from "./nodes/root"
import { isTextNode } from "./nodes/text"
import type {
  APIMessageComponent,
  Interaction,
  JSONEncodable,
  MessageActionRowComponentBuilder,
} from "discord.js"
import type {
  ActionRowElements,
  FileAttachmentElements,
  ModalElements,
  SelectMenuElements,
  // TextElements, // TODO: [NEXT] TextElements
} from "../jsx"
import type { AronaNode } from "./nodes/node"

const EMPTY_STRING = "​"

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

export const renderActionRowButton = (
  node: AronaNode<ActionRowElements["button"]>,
) => {
  console.log("Button render", node.type)
  const customId = node.props.customId ?? node.uuid

  const button = new ButtonBuilder({
    customId,
    disabled: node.props.disabled ?? false,
    style: node.props.style ?? ButtonStyle.Secondary,
    label: renderInnerText(node),
  })

  const listener = async (interaction: Interaction) => {
    if (!interaction.isButton()) return
    if (interaction.customId !== customId) return

    if (!(await node.props.onClick?.(interaction))) {
      await interaction.deferUpdate()
    }
  }

  return { button, customId, listener }
}

export const renderActionRowLink = (
  node: AronaNode<ActionRowElements["link"]>,
) => {
  return new ButtonBuilder({
    disabled: node.props.disabled ?? false,
    label: renderInnerText(node),
    style: ButtonStyle.Link,
    url: node.props.url,
  })
}

export const renderActionRowRoot = (
  node: AronaNode<ActionRowElements["root"]>,
) => {
  const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()

  const interactionListeners = new Map<
    string,
    (interaction: Interaction) => unknown
  >()

  node.children.forEach((child) => {
    switch (child.type) {
      case "arona:button":
        const { button, customId, listener } = renderActionRowButton(child)
        actionRow.addComponents(button)
        interactionListeners.set(customId, listener)
        return
      case "arona:link-button":
        const linkButton = renderActionRowLink(child)
        actionRow.addComponents(linkButton)
        return
      default:
        throw new Error(
          `Unexpected element type: ${child.type} inside ActionRow`,
        )
    }
  })

  return { actionRow, interactionListeners }
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

const renderSeparator = (node: AronaNode): SeparatorBuilder => {
  return new SeparatorBuilder({
    divider: node.props.divider,
    spacing: node.props.spacing,
  })
}

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

  switch (node.type) {
    case "arona:container": {
      const content = renderNodes(node.children)
      const container = new ContainerBuilder({
        components: content.components,
        accent_color: node.props.accentColor
          ? resolveColor(node.props.accentColor)
          : undefined,
        spoiler: node.props.spoiler,
      })

      return {
        components: [container],
        files: content.files,
        interactionListeners: content.interactionListeners,
      }
    }
    case "arona:section": {
      const content = renderNodes(node.children)
      const accessory = renderNodes(node.props.accessory)

      const section = new SectionBuilder({
        components: content.components,
        accessory: accessory.components,
      })
      return {
        components: [section],
        files: [...content.files, ...accessory.files],
        interactionListeners: [
          ...content.interactionListeners,
          ...accessory.interactionListeners,
        ],
      }
    }
    case "arona:button": {
      console.log("Button", node.props, node.children)
      const { button, customId, listener } = renderActionRowButton(node)
      if (isRootNode(node.parent)) {
        const actionRow =
          new ActionRowBuilder<MessageActionRowComponentBuilder>()
        actionRow.addComponents(button)
        return {
          components: [actionRow],
          files: [],
          interactionListeners: [[customId, listener]],
        }
      }

      if (isActionRow(node.parent)) {
        return {
          components: [button],
          files: [],
          interactionListeners: [[customId, listener]],
        }
      }

      throw new Error(
        `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
      )
    }
    case "arona:link-button": {
      const linkButton = renderActionRowLink(node)

      if (isRootNode(node.parent)) {
        const actionRow =
          new ActionRowBuilder<MessageActionRowComponentBuilder>()
        actionRow.addComponents(linkButton)
        return {
          components: [actionRow],
          files: [],
          interactionListeners: [],
        }
      }

      if (isActionRow(node.parent)) {
        return {
          components: [linkButton],
          files: [],
          interactionListeners: [],
        }
      }

      throw new Error(
        `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
      )
    }
    case "arona:separator": {
      const separator = renderSeparator(node)
      return {
        components: [separator],
        files: [],
        interactionListeners: [],
      }
    }
    case "arona:text-root": {
      const textContent = renderInnerText(node)
      if (textContent.length < 1) {
        return {
          components: [],
          files: [],
          interactionListeners: [],
        }
      }

      const text = new TextDisplayBuilder({
        content: textContent,
      })

      return {
        components: [text],
        files: [],
        interactionListeners: [],
      }
    }
    default:
      throw new Error(
        `Unhandled element type: ${node.type} inside ${node.parent?.type}`,
      )
  }
}

const renderNodes = (
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
