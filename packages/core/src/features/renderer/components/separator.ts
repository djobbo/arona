import { type APISeparatorComponent, SeparatorBuilder } from "discord.js"
import { defineComponent } from "../helpers/define-component"

export const {
  name: SEPARATOR_ELEMENT,
  component: Separator,
  render: renderSeparatorComponent,
  guard: isSeparatorComponent,
} = defineComponent<APISeparatorComponent>("arona:separator", (node) => {
  const separator = new SeparatorBuilder({
    divider: node.props.divider,
    spacing: node.props.spacing,
  })

  return {
    components: [separator],
    files: [],
    interactionListeners: [],
  }
})
