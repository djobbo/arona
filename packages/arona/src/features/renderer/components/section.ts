import type { FC, PropsWithChildren, ReactNode } from "react"

interface SectionProps {
  accessory: ReactNode
}

export const Section = "arona:section" as unknown as FC<
  PropsWithChildren<SectionProps>
>
