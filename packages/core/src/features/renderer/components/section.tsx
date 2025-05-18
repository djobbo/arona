import { EMPTY_STRING } from "../../../constants"
import { SectionBuilder, TextDisplayBuilder } from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { renderNodes } from "../helpers/render-nodes"
import type { FC, PropsWithChildren, ReactNode } from "react"

interface SectionAccessoryInternalProps {
  children?: ReactNode
}

export const {
  name: SECTION_ACCESSORY_ELEMENT,
  /**
   * @deprecated
   * Use `Section` instead.
   * This component is not meant to be used directly.
   * It is used internally by the `Section` component.
   */
  component:
    __SectionAccessoryInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY,
  guard: isSectionAccessoryComponent,
  render: renderSectionAccessoryComponent,
} = defineComponent<SectionAccessoryInternalProps>(
  "arona:section-accessory",
  (node) => {
    const content = renderNodes(node.children)
    return {
      components: content.components,
      files: content.files,
      interactionListeners: content.interactionListeners,
    }
  },
)

interface SectionInternalProps {
  children?: ReactNode
}

export const {
  name: SECTION_ELEMENT,
  /**
   * @deprecated
   * Use `Section` instead.
   * This component is not meant to be used directly.
   * It is used internally by the `Section` component.
   */
  component: __SectionInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY,
  guard: isSectionComponent,
  render: renderSectionComponent,
} = defineComponent<SectionInternalProps>("arona:section", (node) => {
  const contentNodes = node.children.filter(
    (child) => !isSectionAccessoryComponent(child),
  )
  const accessoryNodes = node.children.filter(isSectionAccessoryComponent)

  if (accessoryNodes.length > 1) {
    throw new Error(
      `Only one accessory is allowed in a section, found ${accessoryNodes.length}`,
    )
  }

  const content = renderNodes(contentNodes)
  const accessory = renderNodes(accessoryNodes)
  const isEmptySection = content.components.length === 0

  const section = new SectionBuilder({
    components: isEmptySection
      ? [
          new TextDisplayBuilder({
            content: EMPTY_STRING,
          }),
        ]
      : content.components,
    accessory: accessory.components[0],
  })

  return {
    components: [section],
    files: [...content.files, ...accessory.files],
    interactionListeners: [
      ...content.interactionListeners,
      ...accessory.interactionListeners,
    ],
  }
})

interface SectionProps {
  accessory: ReactNode
}

export const Section: FC<PropsWithChildren<SectionProps>> = ({
  children,
  accessory,
  ...props
}) => {
  return (
    <__SectionInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY
      {...props}
    >
      {children}
      <__SectionAccessoryInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY>
        {accessory}
      </__SectionAccessoryInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY>
    </__SectionInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY>
  )
}
