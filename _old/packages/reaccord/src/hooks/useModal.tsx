import { ReaccordNode } from "../renderer/ReaccordNode"
import { renderModalRoot } from "../renderer/renderMessageContent"
import { renderWithRootContext } from "../renderer/renderWithRootContext"
import { useRootNodeContextInternal } from "./MessageContext"
import type {
  AutocompleteInteraction,
  Interaction,
  ModalSubmitInteraction,
} from "discord.js"
import type { RootNode } from "../renderer/RootNode"

const createModal = (Code: () => JSX.Element, rootNode: RootNode) => {
  const modalRoot = new ReaccordNode("reaccord:__modal-root", {}, rootNode)

  const rootContainer = rootNode.reconcilerInstance.createContainer(
    modalRoot,
    0,
    null,
    false,
    null,
    "",
    () => void 0,
    null,
  )

  rootNode.reconcilerInstance.updateContainer(
    renderWithRootContext(Code, rootNode),
    rootContainer,
    null,
  )

  return modalRoot
}

const openModal =
  (rootNode: RootNode) =>
  <
    T extends Exclude<
      Interaction,
      AutocompleteInteraction | ModalSubmitInteraction
    >,
  >(
    Code: (interaction: T) => JSX.Element,
  ) =>
  (interaction: T): true => {
    if (!rootNode.message) return true
    const modalRoot = createModal(() => Code(interaction), rootNode)
    const { modal, listener } = renderModalRoot(modalRoot)

    rootNode.modalInteractionListener = listener

    interaction.showModal(modal)
    return true
  }

export const useModal = () => {
  const rootNode = useRootNodeContextInternal()

  return {
    // If used directly inside button (<button onClick={openModal(Modal)}/>),
    // will prevent the app from defering update, because opening a modal is
    // already an interaction response.
    /**
     * If used directly inside button (<button onClick={openModal(Modal)}/>)
     * will prevent the app from defering update, because opening a modal is
     * already an interaction response.
     * @param Code - The modal component to render.
     * @returns A function that takes an interaction and opens the modal.
     * @example
     * ```tsx
     * const { openModal } = useModal()
     * const handleClick = () => {
     *   openModal(() => <MyModal />)
     * }
     * return <Button onClick={handleClick}>Open Modal</Button>
     * ```
     */
    openModal: openModal(rootNode),
  }
}
