import type { AronaNode } from "../nodes/node"
import type { FC, ReactNode } from "react"

const ACTION_ROW_ELEMENT = "arona:action-row"

interface ActionRowProps {
  children?: ReactNode
}

export const ActionRow = ACTION_ROW_ELEMENT as unknown as FC<ActionRowProps>

export const isActionRowComponent = (
  node?: AronaNode | null,
): node is AronaNode<ActionRowProps> => {
  return node?.type === ACTION_ROW_ELEMENT
}
