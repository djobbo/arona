import {
  type APISelectMenuOption,
  ActionRowBuilder,
  type Interaction,
  type MessageActionRowComponentBuilder,
  type SelectMenuComponentOptionData,
  StringSelectMenuBuilder,
  type StringSelectMenuComponentData,
  type StringSelectMenuInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { isActionRowComponent } from "./action-row"
import { isContainerComponent } from "./container"
import { isRootNode } from "../nodes/root"
import { renderInnerText } from "../helpers/render-inner-text"
import type { ReactNode } from "react"

interface SelectProps
  extends Omit<StringSelectMenuComponentData, "customId" | "options"> {
  /**
   * @deprecated Custom IDs are not recommended unless you know what you're doing.
   * They are used to identify the select-menu in each interaction.
   * If set manually, it should be unique per select-menu, and per interaction.
   */
  customId?: StringSelectMenuComponentData["customId"]
  /**
   * By default, onChange will trigger a defered update automatically.
   * If you want to handle the update manually, return a truthy value.
   * This can be usefull if the interaction needs to be kept alive for a relatively long time
   * (Discord will timeout the interaction after 3 seconds).
   * @example
   * <Select onChange={async (interaction) => {
   *  interaction.deferUpdate()
   *  // do some async stuff that takes more than 3 seconds
   *  await new Promise((resolve) => setTimeout(resolve, 5000))
   *  // return true to prevent the automatic update
   *  return true
   * }}>...</Select>
   */
  onChange?: (
    values: string[],
    interaction: StringSelectMenuInteraction,
  ) => unknown | Promise<unknown>
  children?: ReactNode
}

export const {
  name: SELECT_ELEMENT,
  component: Select,
  render: renderSelectComponent,
  guard: isSelectComponent,
} = defineComponent<SelectProps>("arona:select-string", (node) => {
  const options = node.children
    // TODO: throw if there are invalid options
    .filter(isOptionComponent)
    .map((option) => renderOptionComponent(option).misc)
    .filter((option) => !!option)

  if (options.length === 0) {
    console.warn(
      `Select menu ${node.uuid} has no options. It will not be rendered.`,
    )

    return {
      components: [],
      files: [],
      interactionListeners: [],
    }
  }

  const {
    children: _children,
    customId = node.uuid,
    onChange,
    disabled = false,
    ...props
  } = node.props

  const select = new StringSelectMenuBuilder({
    customId,
    options,
    disabled,
    ...props,
  })

  const listener = async (interaction: Interaction) => {
    if (!interaction.isStringSelectMenu()) return
    if (interaction.customId !== customId) return

    if (!(await onChange?.(interaction.values, interaction))) {
      await interaction.deferUpdate()
    }
  }

  const interactionListeners = [[customId, listener]]

  if (isRootNode(node.parent) || isContainerComponent(node.parent)) {
    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    actionRow.addComponents(select)

    return {
      components: [actionRow],
      files: [],
      interactionListeners,
    }
  }

  if (isActionRowComponent(node.parent)) {
    return {
      components: [select],
      files: [],
      interactionListeners,
    }
  }

  throw new Error(
    `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
  )
})

interface SelectOptionProps
  extends Omit<SelectMenuComponentOptionData, "default" | "label"> {
  selected?: boolean
  children?: ReactNode
}

export const {
  name: OPTION_ELEMENT,
  component: Option,
  guard: isOptionComponent,
  render: renderOptionComponent,
} = defineComponent<SelectOptionProps, APISelectMenuOption>(
  "arona:select-menu-option",
  (node) => {
    const {
      children: _children,
      value,
      selected = false,
      ...props
    } = node.props

    if (!value) {
      return {
        components: [],
        files: [],
        interactionListeners: [],
      }
    }

    const option = new StringSelectMenuOptionBuilder({
      default: selected,
      label: renderInnerText(node) ?? node.props.value,
      value,
      ...props,
    }).toJSON()

    return {
      components: [],
      files: [],
      interactionListeners: [],
      misc: option,
    }
  },
)
