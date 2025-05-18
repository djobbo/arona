import { AronaNode } from "./node"
import {
  BaseInteraction,
  Message,
  MessageFlags,
  TextDisplayBuilder,
} from "discord.js"
import { ConcurrentRoot } from "react-reconciler/constants"
import { MessageProvider } from "../message-provider"
import {
  type ModalComponent,
  type ModalInteractionRef,
  renderModalComponent,
} from "../components/modal"
import { debounce } from "../../../helpers/debounce"
import { renderMessageContent } from "../renderMessageContent"
import type { AronaClient } from "../../discord-client/client"
import type { AronaTextNode } from "./text"
import type { FiberRoot, Reconciler } from "react-reconciler"
import type { Interaction } from "discord.js"
import type { InteractionRef } from "../render"

const MESSAGE_UPDATE_DEBOUNCE_MS = 50
const MESSAGE_FLAGS = MessageFlags.IsComponentsV2

export class AronaRootNode extends AronaNode {
  reconcilerInstance: Reconciler<
    AronaNode,
    AronaNode,
    AronaTextNode,
    unknown,
    unknown
  >
  #rootContainer: FiberRoot
  #modalContainer: FiberRoot | null = null
  discordClient: AronaClient
  interactionRef: InteractionRef | null = null
  message: Message | null = null
  waitForMessageCreation: Promise<Message> | null = null
  hydrationHooks: ((message: Message) => void)[] = []
  #interactionListeners = new Map<
    string,
    (interaction: Interaction) => unknown
  >()
  #modalInteractionListener: ((interaction: Interaction) => unknown) | null =
    null
  #unmountTimeout: Timer | null = null
  #modalRoot: AronaNode | null = null

  unmounted = false
  //TODO: [NEXT] move this
  messageRenderOptions: MessageRenderOptions = {}

  lastMessageUpdatePromise: Promise<Message> | null = null

  constructor(
    interactionRef: InteractionRef,
    messageRenderOptions: MessageRenderOptions,
    reconcilerInstance: Reconciler<
      AronaNode,
      AronaNode,
      AronaTextNode,
      unknown,
      unknown
    >,
  ) {
    super("arona:__root")
    // @ts-expect-error client is AronaClient
    this.discordClient = interactionRef.client
    this.interactionRef = interactionRef
    this.messageRenderOptions = messageRenderOptions
    this.discordClient.addRoot(this)

    this.reconcilerInstance = reconcilerInstance
    this.#rootContainer = this.reconcilerInstance.createContainer(
      this,
      ConcurrentRoot,
      null,
      false,
      false,
      "",
      (error) => {
        // console.trace("Error in root", error)
      },
      null,
    )
  }

  unmount() {
    this.unmounted = true
    this.#unmountTimeout && clearTimeout(this.#unmountTimeout)
    this.#interactionListeners.clear()
    this.discordClient.removeInteractionListener(this.uuid)
    this.reconcilerInstance.updateContainer(null, this.#rootContainer)
    this.#modalInteractionListener = null
    if (this.#modalContainer) {
      this.reconcilerInstance.updateContainer(null, this.#modalContainer)
    }
  }

  interactionListener(interaction: Interaction) {
    if (this.unmounted || !this.message) return
    if (!("customId" in interaction)) return

    const listener = this.#interactionListeners.get(interaction.customId)
    listener?.(interaction)

    this.#modalInteractionListener?.(interaction)
  }

  // TODO: verify if this is still needed
  addHydrationHook(fn: (message: Message) => void) {
    this.hydrationHooks.push(fn)

    return () => {
      this.hydrationHooks = this.hydrationHooks.filter((hook) => hook !== fn)
    }
  }

  async initialRender(Code: () => JSX.Element) {
    if (!!this.messageRenderOptions.unmountAfter) {
      this.#unmountTimeout = setTimeout(() => {
        this.unmount()
      }, this.messageRenderOptions.unmountAfter)
    }

    this.reconcilerInstance.updateContainer(
      <MessageProvider rootNode={this}>
        <Code />
      </MessageProvider>,
      this.#rootContainer,
    )

    await this.render()
  }

  render = debounce(async () => {
    if (this.unmounted) return
    if (!this.interactionRef) throw new Error("No interaction ref")

    const { messageContent, interactionListeners } = renderMessageContent(this)
    // Reset all listeners, including modal ones
    this.#interactionListeners = interactionListeners

    if (!this.message) {
      // If no message creation request is pending, create a new one
      if (!this.waitForMessageCreation) {
        const createMessageAndHydrate = async () => {
          if (!this.interactionRef) throw new Error("No ref")

          let reply: Message | null | undefined = null

          if (this.interactionRef instanceof Message) {
            reply = await this.interactionRef.reply({
              ...messageContent,
              flags: MESSAGE_FLAGS,
            })
          } else if (this.interactionRef instanceof BaseInteraction) {
            reply = await this.interactionRef
              .reply({
                ...messageContent,
                ephemeral: this.messageRenderOptions?.ephemeral ?? false,
                withResponse: true,
                flags: MESSAGE_FLAGS,
              })
              .then((res) => res.resource?.message)
          } else {
            reply = await this.interactionRef.send({
              ...messageContent,
              flags: MESSAGE_FLAGS,
            })
          }

          if (!reply) throw new Error("No message created")
          this.message = reply

          if (this.hydrationHooks.length > 0) {
            this.hydrationHooks.forEach((hook) => hook(reply))
          }

          return reply
        }

        this.waitForMessageCreation = createMessageAndHydrate()
        this.message = await this.waitForMessageCreation
        return this.message
      }

      this.message = await this.waitForMessageCreation
    }

    if (!this.message) throw new Error("No message to update")

    if (!this.message.editable) throw new Error("Message is not editable")

    if (this.messageRenderOptions?.ephemeral) {
      if (!(this.interactionRef instanceof BaseInteraction))
        throw new Error("Can't send ephemeral message to non-interaction")

      await this.interactionRef.editReply(messageContent)
    } else {
      await this.message.edit(messageContent)
    }

    return this.message
  }, MESSAGE_UPDATE_DEBOUNCE_MS)

  async renderModal(Code: ModalComponent, interaction: ModalInteractionRef) {
    this.#modalRoot ??= new AronaNode("arona:__modal-root", {}, this)
    this.#modalContainer ??= this.reconcilerInstance.createContainer(
      this.#modalRoot,
      ConcurrentRoot,
      null,
      false,
      false,
      "",
      (error) => {
        // console.trace("Error in modal", error)
      },
      null,
    )

    this.reconcilerInstance.updateContainer(
      <Code interaction={interaction} />,
      this.#modalContainer,
      null,
      () => {
        if (!this.#modalRoot) return
        const modal = renderModalComponent(this.#modalRoot.children[0])

        // TODO: clean this up
        this.#modalInteractionListener =
          modal.interactionListeners?.[0]?.[1] ?? null

        // TODO: Await??
        interaction.showModal(modal.components[0])
      },
    )
  }
}

export const isRootNode = (node?: AronaNode | null): node is AronaRootNode => {
  return node?.type === "arona:__root"
}
