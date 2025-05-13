import { AronaNode } from "./node"
import { BaseInteraction, Message } from "discord.js"
import { ConcurrentRoot } from "react-reconciler/constants"
import { MessageProvider } from "../message-provider"
import { createElement } from "react"
import { debounce } from "../../../helpers/debounce"
import { renderMessageContent } from "../renderMessageContent"
import type { AronaClient } from "../../discord-client/client"
import type { AronaTextNode } from "./text"
import type { FiberRoot, Reconciler } from "react-reconciler"
import type { Interaction } from "discord.js"
import type { InteractionRef } from "../render"

const MESSAGE_UPDATE_DEBOUNCE_MS = 50

export class AronaRootNode extends AronaNode {
  reconcilerInstance: Reconciler<
    AronaNode,
    AronaNode,
    AronaTextNode,
    unknown,
    unknown,
    unknown
  >
  #rootContainer: FiberRoot
  discordClient: AronaClient
  interactionRef: InteractionRef | null = null
  message: Message | null = null
  waitForMessageCreation: Promise<Message> | null = null
  hydrationHooks: ((message: Message) => void)[] = []
  #interactionListeners: Map<
    string,
    (interaction: Interaction) => unknown
  > | null = null
  modalInteractionListener: ((interaction: Interaction) => unknown) | null =
    null
  #unmountTimeout: Timer | null = null

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
      unknown,
      unknown
    >,
  ) {
    super("reaccord:__root")
    // @ts-expect-error client is AronaClient
    this.discordClient = interactionRef.client
    this.interactionRef = interactionRef
    this.messageRenderOptions = messageRenderOptions
    this.discordClient.addInteractionListener(
      this.uuid,
      this.#globalInteractionListener,
    )

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
    this.#interactionListeners?.clear()
    this.discordClient.removeInteractionListener(this.uuid)
    this.reconcilerInstance.updateContainer(null, this.#rootContainer, null)
  }

  #globalInteractionListener(interaction: Interaction) {
    if (this.unmounted || !this.message) return
    if (!("customId" in interaction)) return

    const listener = this.#interactionListeners?.get(interaction.customId)
    listener?.(interaction)

    this.modalInteractionListener?.(interaction)
  }

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
      null,
    )

    await this.render()
  }

  render = debounce(async () => {
    if (this.unmounted) return
    if (!this.interactionRef) throw new Error("No interaction ref")

    const { messageContent, interactionListeners } = renderMessageContent(this)
    this.#interactionListeners = interactionListeners

    if (!this.message) {
      // If no message creation request is pending, create a new one
      if (!this.waitForMessageCreation) {
        const createMessageAndHydrate = async () => {
          if (!this.interactionRef) throw new Error("No ref")

          let reply: Message

          if (this.interactionRef instanceof Message) {
            reply = await this.interactionRef.reply(messageContent)
          } else if (this.interactionRef instanceof BaseInteraction) {
            reply = await this.interactionRef.reply({
              ...messageContent,
              ephemeral: this.messageRenderOptions?.ephemeral ?? false,
              fetchReply: true,
            })
          } else {
            reply = await this.interactionRef.send(messageContent)
          }

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
}
