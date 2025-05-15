import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type LinkButtonComponentData,
  type MessageActionRowComponentBuilder,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { isActionRowComponent } from "./action-row"
import { isContainerComponent } from "./container"
import { isRootNode } from "../nodes/root"
import { renderInnerText } from "../helpers/render-inner-text"
import type { ReactNode } from "react"

interface LinkButtonProps extends Omit<LinkButtonComponentData, "style"> {
  children?: ReactNode
}

export const {
  name: LINK_BUTTON_ELEMENT,
  component: LinkButton,
  guard: isLinkButtonComponent,
  render: renderLinkButtonComponent,
} = defineComponent<LinkButtonProps>("arona:link-button", (node) => {
  const linkButton = new ButtonBuilder({
    disabled: node.props.disabled ?? false,
    label: renderInnerText(node),
    style: ButtonStyle.Link,
    url: node.props.url,
  })

  if (isRootNode(node.parent) || isContainerComponent(node.parent)) {
    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>()
    actionRow.addComponents(linkButton)
    return {
      components: [actionRow],
      files: [],
      interactionListeners: [],
    }
  }

  if (isActionRowComponent(node.parent)) {
    return {
      components: [linkButton],
      files: [],
      interactionListeners: [],
    }
  }

  throw new Error(
    `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
  )
})
