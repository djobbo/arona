import {
  ActionRowBuilder,
  ButtonBuilder,
  type ButtonInteraction,
  ButtonStyle,
  type Interaction,
  type InteractionButtonComponentData,
  type MessageActionRowComponentBuilder,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { isActionRowComponent } from "./action-row"
import { isContainerComponent } from "./container"
import { isRootNode } from "../nodes/root"
import { isSectionAccessoryComponent } from "./section"
import { renderInnerText } from "../helpers/render-inner-text"
import type { ReactNode } from "react"

interface ButtonProps extends Partial<InteractionButtonComponentData> {
  /**
   * @deprecated Custom IDs are not recommended unless you know what you're doing.
   * They are used to identify the button in each interaction.
   * If set manually, it should be unique per button, and per interaction.
   */
  customId?: string
  /**
   * By default, onClick will trigger a defered update automatically.
   * If you want to handle the update manually, return a truthy value.
   * This can be usefull if the interaction needs to be kept alive for a relatively long time
   * (Discord will timeout the interaction after 3 seconds).
   * @example
   * <Button onClick={async (interaction) => {
   *  interaction.deferUpdate()
   *  // do some async stuff that takes more than 3 seconds
   *  await new Promise((resolve) => setTimeout(resolve, 5000))
   *  // return true to prevent the automatic update
   *  return true
   * }}>...</Button>
   */
  onClick?: (interaction: ButtonInteraction) => unknown | Promise<unknown>
  style?: Exclude<InteractionButtonComponentData["style"], ButtonStyle.Link>
  children?: ReactNode
}

export const {
  name: BUTTON_ELEMENT,
  component: Button,
  guard: isButtonComponent,
  render: renderButtonComponent,
} = defineComponent<ButtonProps>("arona:button", (node) => {
  const {
    children: _children,
    customId = node.uuid,
    onClick,
    disabled = false,
    style = ButtonStyle.Secondary,
    ...props
  } = node.props

  const button = new ButtonBuilder({
    customId,
    disabled,
    style,
    ...props,
    label: renderInnerText(node),
  })

  const listener = async (interaction: Interaction) => {
    if (!interaction.isButton()) return
    if (interaction.customId !== customId) return

    if (!(await onClick?.(interaction))) {
      await interaction.deferUpdate()
    }
  }

  const interactionListeners = [[customId, listener]]

  if (isRootNode(node.parent) || isContainerComponent(node.parent)) {
    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    actionRow.addComponents(button)
    return {
      components: [actionRow],
      files: [],
      interactionListeners,
    }
  }

  if (
    isActionRowComponent(node.parent) ||
    isSectionAccessoryComponent(node.parent)
  ) {
    return {
      components: [button],
      files: [],
      interactionListeners,
    }
  }

  throw new Error(
    `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
  )
})
