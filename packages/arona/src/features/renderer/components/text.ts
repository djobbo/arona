import { TextDisplayBuilder } from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { renderInnerText } from "../helpers/render-inner-text"
import type { AronaNode } from "../nodes/node"
import type { FC, PropsWithChildren, ReactNode } from "react"

interface TextProps {
  children?: ReactNode
}

export const {
  name: TEXT_ELEMENT,
  component: Text,
  guard: isTextComponent,
  render: renderTextComponent,
} = defineComponent<TextProps>("arona:text", (node) => {
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
})
