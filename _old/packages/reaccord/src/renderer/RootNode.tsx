import { BaseInteraction, Message } from "discord.js"
import { ReaccordNode } from "./ReaccordNode"
import { debounce } from "../helpers/debounce"
import { renderMessageContent } from "./renderMessageContent"
import { renderWithRootContext } from "./renderWithRootContext"
import type { Client, MessageRenderOptions } from "../Client"
import type { FiberRoot, Reconciler } from "react-reconciler"
import type { Interaction } from "discord.js"
import type { InteractionRefType } from "./renderMessage"
import type { TextNode } from "./TextNode"

const MESSAGE_UPDATE_DEBOUNCE_MS = 50

export class RootNode extends ReaccordNode {
  reconcilerInstance: Reconciler<
    ReaccordNode,
    ReaccordNode,
    TextNode,
    unknown,
    unknown
  >
  #rootContainer: FiberRoot
  discordClient: Client
  terminateInteraction: () => void = () => void 0
  ref: InteractionRefType | null = null
  message: Message | null = null
  waitForMessageCreation: Promise<Message> | null = null
  hydrationHooks: ((message: Message) => void)[] = []
  #globalInteractionListener: (interaction: Interaction) => void = () => {} // TODO: [NEXT] remove?
  #interactionListeners: Map<
    string,
    (interaction: Interaction) => unknown
  > | null = null
  modalInteractionListener: ((interaction: Interaction) => unknown) | null =
    null

  unmounted = false
  //TODO: [NEXT] move this
  messageRenderOptions: MessageRenderOptions = {}

  lastMessageUpdatePromise: Promise<Message> | null = null

  constructor(
    discordClient: Client,
    reconcilerInstance: Reconciler<
      ReaccordNode,
      ReaccordNode,
      TextNode,
      unknown,
      unknown
    >,
  ) {
    super("reaccord:__root")
    this.discordClient = discordClient
    this.setupGlobalInteractionListener()

    this.reconcilerInstance = reconcilerInstance
    this.#rootContainer = this.reconcilerInstance.createContainer(
      this,
      0,
      null,
      false,
      null,
      "",
      () => void 0,
      null,
    )
  }

  unmount() {
    this.unmounted = true
    this.#interactionListeners?.clear()
    this.discordClient.off("interactionCreate", this.#globalInteractionListener)
    this.reconcilerInstance.updateContainer(null, this.#rootContainer, null)
  }

  setupGlobalInteractionListener() {
    this.#globalInteractionListener = (interaction: Interaction) => {
      if (this.unmounted || !this.message) return

      if (!("customId" in interaction)) return

      const listener = this.#interactionListeners?.get(interaction.customId)
      listener?.(interaction)

      this.modalInteractionListener?.(interaction)
    }
    this.discordClient.on("interactionCreate", this.#globalInteractionListener)
  }

  addHydrationHook(fn: (message: Message) => void) {
    this.hydrationHooks.push(fn)

    return () => {
      this.hydrationHooks = this.hydrationHooks.filter((hook) => hook !== fn)
    }
  }

  async replyToInteraction(
    ref: InteractionRefType,
    Code: () => JSX.Element,
    messageRenderOptions?: MessageRenderOptions,
  ) {
    if (!this.discordClient)
      throw new Error("Can't reply to interaction, Discord client is not set")

    this.ref = ref

    this.messageRenderOptions = {
      ...(this.discordClient.messageRenderOptions ?? {}),
      ...messageRenderOptions,
    }

    let timeout: Timer | undefined

    this.terminateInteraction = () => {
      if (timeout) clearTimeout(timeout)
      this.unmount()
    }

    if (!!this.messageRenderOptions.unmountAfter) {
      timeout = setTimeout(() => {
        this.terminateInteraction()
      }, this.messageRenderOptions.unmountAfter * 1000)
    }

    this.reconcilerInstance.updateContainer(
      renderWithRootContext(Code, this),
      this.#rootContainer,
      null,
    )

    await this.render()
  }

  render = debounce(async () => {
    if (this.unmounted) return

    if (!this.ref) throw new Error("No ref")

    const { messageContent, interactionListeners } = renderMessageContent(this)
    this.#interactionListeners = interactionListeners

    if (!this.message) {
      // If no message creation request is pending, create a new one
      if (!this.waitForMessageCreation) {
        const createMessageAndHydrate = async () => {
          if (!this.ref) throw new Error("No ref")

          let reply: Message

          if (this.ref instanceof Message) {
            reply = await this.ref.reply(messageContent)
          } else if (this.ref instanceof BaseInteraction) {
            reply = await this.ref.reply({
              ...messageContent,
              ephemeral: this.messageRenderOptions?.ephemeral ?? false,
              fetchReply: true,
            })
          } else {
            reply = await this.ref.send(messageContent)
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
      if (!(this.ref instanceof BaseInteraction))
        throw new Error("Can't send ephemeral message to non-interaction")

      await this.ref.editReply(messageContent)
    } else {
      await this.message.edit(messageContent)
    }

    return this.message
  }, MESSAGE_UPDATE_DEBOUNCE_MS)
}
