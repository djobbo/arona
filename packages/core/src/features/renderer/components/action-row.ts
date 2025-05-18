import { ActionRowBuilder } from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { renderNodes } from "../helpers/render-nodes"
import type { ReactNode } from "react"

interface ActionRowProps {
  children?: ReactNode
}

export const {
  name: ACTION_ROW_ELEMENT,
  component: ActionRow,
  guard: isActionRowComponent,
  render: renderActionRowComponent,
} = defineComponent<ActionRowProps>("arona:action-row", (node) => {
  const content = renderNodes(node.children)
  const actionRow = new ActionRowBuilder({
    components: content.components,
  })

  return {
    components: [actionRow],
    files: content.files,
    interactionListeners: content.interactionListeners,
  }
})
