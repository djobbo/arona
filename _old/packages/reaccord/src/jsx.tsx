// Embed Elements

import { forwardRef } from "react"
import type {
  Attachment,
  AttachmentBuilder,
  ButtonInteraction,
  ButtonStyle,
  ColorResolvable,
  ComponentEmojiResolvable,
  ModalSubmitInteraction,
  StringSelectMenuInteraction,
} from "discord.js"
import type { FC, ReactNode } from "react"
import type { Stream } from "node:stream"

// const ReaccordElementsNames = {
//   Root: "reaccord:__root",
//   FileAttachment: "reaccord:file-attachment",
//   ImageAttachment: "reaccord:image-attachment",
//   EmbedRoot: "reaccord:embed-root",
//   EmbedTitle: "reaccord:embed-title",
//   EmbedDescription: "reaccord:embed-description",
//   EmbedFooter: "reaccord:embed-footer",
//   EmbedAuthor: "reaccord:embed-author",
//   EmbedField: "reaccord:embed-field",
//   EmbedImage: "reaccord:embed-image",
//   EmbedThumbnail: "reaccord:embed-thumbnail",
//   ActionRowRoot: "reaccord:actionrow-root",
//   ActionRowButton: "reaccord:actionrow-button",
//   ActionRowLink: "reaccord:actionrow-link",
//   SelectMenuRoot: "reaccord:selectmenu-root",
//   SelectMenuOption: "reaccord:selectmenu-option",
//   ModalRoot: "reaccord:__modal-root",
//   ModalWrapper: "reaccord:modal-wrapper",
//   ModalInput: "reaccord:modal-input",
//   // TODO: TextElements
// } as const

// FileAttachment Elements

export type FileAttachment =
  | Buffer
  | Stream
  | string
  | AttachmentBuilder
  | Attachment

type _FileAttachmentBase = { file: FileAttachment } | { src: string }

export type FileAttachmentElements = {
  file: _FileAttachmentBase
  image: _FileAttachmentBase
}

export const File = "reaccord:file-attachment" as unknown as FC<
  FileAttachmentElements["file"]
>

export const Image = "reaccord:image-attachment" as unknown as FC<
  FileAttachmentElements["image"]
>

// Embed Elements

export type EmbedElements = {
  root: {
    children?: ReactNode
    url?: string
    timestamp?: Date | number | null
    color?: ColorResolvable
  }
  title: {
    children?: ReactNode
  }
  description: {
    children?: ReactNode
  }
  footer: {
    children?: ReactNode
    iconURL?: string
  }
  author: {
    name: string
    url?: string
    iconURL?: string
  }
  field: {
    title: string
    children?: ReactNode
    inline?: boolean
  }
  image: _FileAttachmentBase
  thumbnail: _FileAttachmentBase
}

const EmbedRoot = (props: unknown, ref: unknown) => {
  // @ts-expect-error
  return <reaccord:embed-root {...props} ref={ref} />
}

export const Embed = Object.assign(
  forwardRef(EmbedRoot) as unknown as FC<EmbedElements["root"]>,
  {
    Title: "reaccord:embed-title" as unknown as FC<EmbedElements["title"]>,
    Description: "reaccord:embed-description" as unknown as FC<
      EmbedElements["description"]
    >,
    Footer: "reaccord:embed-footer" as unknown as FC<EmbedElements["footer"]>,
    Author: "reaccord:embed-author" as unknown as FC<EmbedElements["author"]>,
    Field: "reaccord:embed-field" as unknown as FC<EmbedElements["field"]>,
    Image: "reaccord:embed-image" as unknown as FC<EmbedElements["image"]>,
    Thumbnail: "reaccord:embed-thumbnail" as unknown as FC<
      EmbedElements["thumbnail"]
    >,
  },
)

// ActionRow Elements

type _ButtonBase = {
  /**
   * Label for the button, max 80 characters
   */
  children?: ReactNode
  style?: ButtonStyle
  emoji?: never
  disabled?: boolean
}

export type ActionRowElements = {
  // Interaction Components
  root: {
    children?: ReactNode
  }
  button: _ButtonBase & {
    /**
     * @deprecated Custom IDs are not recommended unless you know what you're doing.
     * They are used to identify the button in the interaction.
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
    style?: Exclude<ButtonStyle, ButtonStyle.Link>
  }
  link: _ButtonBase & {
    url: string
  }
}

const ActionRowRoot = (props: unknown, ref: unknown) => {
  // @ts-expect-error
  return <reaccord:actionrow-root {...props} ref={ref} />
}

export const ActionRow = Object.assign(
  forwardRef(ActionRowRoot) as unknown as FC<ActionRowElements["root"]>,
  {
    Button: "reaccord:actionrow-button" as unknown as FC<
      ActionRowElements["button"]
    >,
    Link: "reaccord:actionrow-link" as unknown as FC<ActionRowElements["link"]>,
  },
)

export const Button = ActionRow.Button
export const LinkButton = ActionRow.Link

export type SelectMenuElements = {
  root: {
    /**
     * @deprecated Custom IDs are not recommended unless you know what you're doing.
     * They are used to identify the select menu in the interaction.
     * If set manually, it should be unique per select menu, and per interaction.
     */
    customId?: string
    /**
     * By default, onChange will trigger a defered update automatically.
     * If you want to handle the update manually, return a truthy value.
     * This can be usefull if the interaction needs to be kept alive for a relatively long time
     * (Discord will timeout the interaction after 3 seconds).
     * @example
     * <SelectMenu onChange={async (values, interaction) => {
     * interaction.deferUpdate()
     * // do some async stuff that takes more than 3 seconds
     * await new Promise((resolve) => setTimeout(resolve, 5000))
     * // return true to prevent the automatic update
     * return true
     * }}>...</SelectMenu>
     */
    onChange?: (
      values: string[],
      interaction: StringSelectMenuInteraction,
    ) => any | Promise<any>
    children?: ReactNode
    disabled?: boolean
    placeholder?: string
  }
  option: {
    selected?: boolean
    description?: string
    children?: ReactNode
    value: string
    emoji?: ComponentEmojiResolvable
  }
}

const SelectMenuRoot = (props: unknown, ref: unknown) => {
  // @ts-expect-error
  return <reaccord:selectmenu-root {...props} ref={ref} />
}

export const SelectMenu = Object.assign(
  forwardRef(SelectMenuRoot) as unknown as FC<SelectMenuElements["root"]>,
  {
    Option: "reaccord:selectmenu-option" as unknown as FC<
      SelectMenuElements["option"]
    >,
  },
)

// Modal Elements

export type ModalElements<FieldName extends string = string> = {
  wrapper: {
    /**
     * @deprecated Custom IDs are not recommended unless you know what you're doing.
     * They are used to identify the modal in the interaction.
     * If set manually, it should be unique per modal, and per interaction.
     */
    customId?: string
    children?: ReactNode
    title: string
    /**
     * By default, onSubmit will trigger a message and then delete it
     * in order to respond to the interaction.
     * To prevent this, return a truthy value
     */
    onSubmit?: (
      props: Partial<Record<FieldName, string>>,
      interaction: ModalSubmitInteraction,
    ) => any | Promise<any>
  }
  input: {
    /**
     * Input name should be unique per modal
     */
    name: FieldName
    onChange?: (
      value: string,
      interaction: ModalSubmitInteraction,
    ) => any | Promise<any>
    label?: string
    value?: string
    placeholder?: string
    required?: boolean
    paragraph?: boolean
  }
}

const ModalRoot = (props: unknown, ref: unknown) => {
  // @ts-expect-error
  return <reaccord:modal-wrapper {...props} ref={ref} />
}

export const Modal = Object.assign(
  forwardRef(ModalRoot) as unknown as <FieldName extends string = string>(
    props: ModalElements<FieldName>["wrapper"],
  ) => JSX.Element,
  {
    Input: "reaccord:modal-input" as unknown as <
      FieldName extends string = string,
    >(
      props: ModalElements<FieldName>["input"],
    ) => JSX.Element,
  },
)

// Text Elements

export type TextElements = {
  // TODO: update these
  br: {}
  code: {
    children?: ReactNode
  }
  codeblock: {
    lang: string //TODO: add some lang suggestions
    children?: ReactNode
    multiline?: boolean
  }
  span: {
    italic?: boolean
    bold?: boolean
    children?: ReactNode
  }
  link: {
    href: string
    children?: ReactNode
  }
}

export const Br = "reaccord:text-br" as unknown as FC<TextElements["br"]>
export const Code = "reaccord:text-code" as unknown as FC<TextElements["code"]>
export const CodeBlock = "reaccord:text-codeblock" as unknown as FC<
  TextElements["codeblock"]
>
export const Span = "reaccord:text-span" as unknown as FC<TextElements["span"]>
export const Link = "reaccord:text-link" as unknown as FC<TextElements["link"]>

export type ReaccordElements = {
  fileAttachment: FileAttachmentElements
  embed: EmbedElements
  actionRow: ActionRowElements
  modal: ModalElements
  text: TextElements
}
