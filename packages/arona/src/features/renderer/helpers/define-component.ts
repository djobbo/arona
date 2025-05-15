import type {
  APIMessageComponent,
  Interaction,
  JSONEncodable,
} from "discord.js"
import type { AronaNode } from "../nodes/node"
import type { AronaProps, FileAttachment } from "../components"
import type { FC } from "react"

export const defineComponent = <Props>(
  name: string,
  render: (node: AronaNode<Props>) => {
    components: JSONEncodable<APIMessageComponent>[]
    files: FileAttachment[]
    interactionListeners: [string, (interaction: Interaction) => unknown][]
  },
) => {
  return {
    name,
    component: name as unknown as FC<AronaProps<Props>>,
    render,
    guard: (node?: AronaNode | null): node is AronaNode<Props> => {
      return node?.type === name
    },
  }
}
