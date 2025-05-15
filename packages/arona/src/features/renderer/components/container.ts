import {
  type APIContainerComponent,
  type ColorResolvable,
  ContainerBuilder,
  resolveColor,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { renderNodes } from "../helpers/render-nodes"
import type { ReactNode } from "react"

interface ContainerProps
  extends Omit<APIContainerComponent, "accent_color" | "components"> {
  accentColor?: ColorResolvable
  children?: ReactNode
}

export const {
  name: CONTAINER_ELEMENT,
  component: Container,
  guard: isContainerComponent,
  render: renderContainerComponent,
} = defineComponent<ContainerProps>("arona:container", (node) => {
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
})
