import { CodeBlock } from "reaccord"
import type { ReactNode } from "react"

export type ChalkboardProps = {
  children: ReactNode
}

export const Chalkboard = ({ children }: ChalkboardProps) => {
  return <CodeBlock lang="ansi">{children}</CodeBlock>
}
