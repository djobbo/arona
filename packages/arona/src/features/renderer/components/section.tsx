import type { AronaNode } from "../nodes/node"
import type { FC, PropsWithChildren, ReactNode } from "react"

const SECTION_ELEMENT = "arona:section"
const SECTION_ACCESSORY_ELEMENT = "arona:section-accessory"

interface SectionInternalProps {
  children?: ReactNode
}

const SectionInternal = SECTION_ELEMENT as unknown as FC<SectionInternalProps>

interface SectionAccessoryInternalProps {
  children?: ReactNode
}

const SectionAccessoryInternal =
  SECTION_ACCESSORY_ELEMENT as unknown as FC<SectionAccessoryInternalProps>

interface SectionProps {
  accessory: ReactNode
}

export const Section: FC<PropsWithChildren<SectionProps>> = ({
  children,
  accessory,
  ...props
}) => {
  return (
    <SectionInternal {...props}>
      {children}
      <SectionAccessoryInternal>{accessory}</SectionAccessoryInternal>
    </SectionInternal>
  )
}

export const isSectionComponent = (
  node?: AronaNode | null,
): node is AronaNode<SectionInternalProps> => {
  return node?.type === SECTION_ELEMENT
}

export const isSectionAccessoryComponent = (
  node?: AronaNode | null,
): node is AronaNode<SectionAccessoryInternalProps> => {
  return node?.type === SECTION_ACCESSORY_ELEMENT
}
