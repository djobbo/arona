import { ActionRowBuilder, ModalBuilder, TextInputBuilder } from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { useMessageInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY } from "../message-provider"
import type {
  AutocompleteInteraction,
  Interaction,
  ModalComponentData,
  ModalSubmitInteraction,
  TextInputComponentData,
} from "discord.js"
import type { ReactNode } from "react"

export type ModalInteractionRef = Exclude<
  Interaction,
  AutocompleteInteraction | ModalSubmitInteraction
>

export type ModalComponent = ({
  interaction,
}: {
  interaction: ModalInteractionRef
}) => JSX.Element

export const useModal = () => {
  const rootNode =
    useMessageInternal_DO_NOT_USE_OR_YOU_WILL_BE_BANNED_FROM_THE_PARTY()

  return {
    openModal: (Code: ModalComponent) => (interaction: ModalInteractionRef) => {
      rootNode.renderModal(Code, interaction)
      // Prevent interaction from being deferred
      return true
    },
  }
}

// TODO: <TextArea> and <TextInput> should be separate components
interface TextInputProps extends Omit<TextInputComponentData, "customId"> {
  /**
   * @deprecated Custom IDs are not recommended unless you know what you're doing.
   * They are used to identify the text input in each interaction.
   * If set manually, it should be unique per text input, and per interaction.
   */
  customId?: ModalComponentData["customId"]
  name: string
  onChange?: (value: string, interaction: Interaction) => unknown
}

export const {
  name: TEXT_INPUT_ELEMENT,
  component: TextInput,
  guard: isTextInputComponent,
  render: renderTextInputComponent,
} = defineComponent<
  TextInputProps,
  {
    customId: string
    name: string
    onChange: (value: string, interaction: Interaction) => unknown
  }
>("arona:text-input", (node) => {
  const { customId = node.uuid, name, onChange, ...props } = node.props

  const textInput = new TextInputBuilder({
    customId,
    ...props,
  })

  // TODO: check if inside action row
  const actionRow = new ActionRowBuilder({
    components: [textInput],
  })

  return {
    components: [actionRow],
    files: [],
    interactionListeners: [],
    misc: { customId, name, onChange },
  }
})

interface ModalProps
  extends Omit<ModalComponentData, "customId" | "components"> {
  /**
   * @deprecated Custom IDs are not recommended unless you know what you're doing.
   * They are used to identify the modal in each interaction.
   * If set manually, it should be unique per modal, and per interaction.
   */
  customId?: ModalComponentData["customId"]
  onSubmit?: (
    values: Record<string, string>,
    interaction: Interaction,
  ) => unknown
  children?: ReactNode
}

export const {
  name: MODAL_ELEMENT,
  component: Modal,
  guard: isModalComponent,
  render: renderModalComponent,
} = defineComponent<ModalProps>("arona:modal", (node) => {
  const textInputs = node.children
    .filter(isTextInputComponent)
    .map(renderTextInputComponent)

  const {
    customId = node.uuid,
    children: _children,
    onSubmit,
    ...props
  } = node.props

  const modal = new ModalBuilder({
    customId,
    ...props,
    components: textInputs.map((input) => input.components).flat(),
  })

  const listener = async (interaction: Interaction) => {
    if (!interaction.isModalSubmit()) return
    if (interaction.customId !== customId) return

    let props = new Map<string, string>()

    textInputs.map((input) => {
      if (!input.misc) return

      const value = interaction.fields.getTextInputValue(input.misc.customId)
      input.misc.onChange?.(value, interaction)
      props.set(input.misc.name, value)
    })

    if (
      !(await node.props.onSubmit?.(Object.fromEntries(props), interaction))
    ) {
      await interaction.deferUpdate()
    }
  }

  const interactionListeners = [[customId, listener]] as const

  return {
    components: [modal],
    files: [],
    interactionListeners,
  }
})
