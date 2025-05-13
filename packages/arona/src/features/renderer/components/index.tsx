// Embed Elements

import {
  type APIAttachment,
  type APIContainerComponent,
  type APISeparatorComponent,
  type Attachment,
  type AttachmentBuilder,
  type AttachmentPayload,
  type BufferResolvable,
  type ButtonInteraction,
  type ButtonStyle,
  type ColorResolvable,
  type ComponentEmojiResolvable,
  type InteractionButtonComponentData,
  type JSONEncodable,
  type LinkButtonComponentData,
  type ModalSubmitInteraction,
  type StringSelectMenuInteraction,
} from "discord.js"
import { forwardRef } from "react"
import type { FC, PropsWithChildren, ReactNode } from "react"
import type { Stream } from "node:stream"

type AronaProps<T> = Omit<T, "type" | "id" | "customId">

export type FileAttachment =
  | string
  | BufferResolvable
  | Stream
  | JSONEncodable<APIAttachment>
  | Attachment
  | AttachmentBuilder
  | AttachmentPayload

type _FileAttachmentBase = { file: FileAttachment } | { src: string }

export type FileAttachmentElements = {
  file: _FileAttachmentBase
  image: _FileAttachmentBase
}

// Layout Elements

interface ContainerProps
  extends AronaProps<
    Omit<APIContainerComponent, "accent_color" | "components">
  > {
  accentColor?: ColorResolvable
}

export const Container = "arona:container" as unknown as FC<
  PropsWithChildren<ContainerProps>
>

export const Separator = "arona:separator" as unknown as FC<
  AronaProps<APISeparatorComponent>
>

// Text Elements

export const Text = "arona:text-root" as unknown as FC<PropsWithChildren<{}>>

// ActionRow Elements

export const ActionRow = "arona:action-row" as unknown as FC<
  PropsWithChildren<{}>
>

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

export const LinkButton = "arona:link-button" as unknown as FC<
  PropsWithChildren<Partial<Omit<AronaProps<LinkButtonComponentData>, "style">>>
>
