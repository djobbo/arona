import type { AronaProps } from "./types"
import type {
  ButtonInteraction,
  ButtonStyle,
  InteractionButtonComponentData,
} from "discord.js"
import type { FC, PropsWithChildren } from "react"

interface ButtonProps
  extends Partial<AronaProps<InteractionButtonComponentData>> {
  /**
   * @deprecated Custom IDs are not recommended unless you know what you're doing.
   * They are used to identify the button in each interaction.
   * If set manually, it should be unique per button, and per interaction.
   */
  customId?: string
  /**
   * By default, onClick will trigger a defered update automatically.
   * If you want to handle the update manually, return a truthy value.
   * This can be usefull if the interaction needs to be kept alive for a relatively long time
   * (Discord will timeout the interaction after 3 seconds).
   * @example
   * <Button onClick={async (interaction) => {
   *  interaction.deferUpdate()
   *  // do some async stuff that takes more than 3 seconds
   *  await new Promise((resolve) => setTimeout(resolve, 5000))
   *  // return true to prevent the automatic update
   *  return true
   * }}>...</Button>
   */
  onClick?: (interaction: ButtonInteraction) => any | Promise<any>
  style?: Exclude<InteractionButtonComponentData["style"], ButtonStyle.Link>
}

export const Button = "arona:button" as unknown as FC<
  PropsWithChildren<ButtonProps>
>
