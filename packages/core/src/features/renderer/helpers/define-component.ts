import type {
  APIMessageComponent,
  Interaction,
  JSONEncodable,
} from "discord.js"
import type { AronaNode } from "../nodes/node"
import type { AronaProps, FileAttachment } from "../components"
import type { FC } from "react"

export interface RenderOutput {
  components: JSONEncodable<APIMessageComponent>[]
  files: FileAttachment[]
  interactionListeners: [string, (interaction: Interaction) => unknown][]
}

export const defineComponent = <Props, Misc extends unknown = never>(
  name: string,
  render: (node: AronaNode<Props>) => RenderOutput & { misc?: Misc },
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
