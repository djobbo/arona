import { Client as DiscordClient } from "discord.js"
import { refreshCommands } from "./refreshCommands"
import type {
  ClientEvents,
  ClientOptions as DiscordClientOptions,
  Interaction,
} from "discord.js"
import type { CommandBase } from "./Command"

export type MessageRenderOptions = {
  /**
   * Interactions will not respond after this amount of time (s).
   * @default 300 (5min)
   */
  unmountAfter?: number | null
  ephemeral?: boolean
}

type ClientOptions = DiscordClientOptions & {
  token: string
  devGuildId?: string
  clientId?: string
  messageRenderOptions?: MessageRenderOptions
  commands?: CommandBase[]
}

export type EventHandler<Event extends keyof ClientEvents> = (
  ...args: ClientEvents[Event]
) => void | Promise<void>

class EventMergerClient extends DiscordClient {
  #eventHandlers: Partial<{
    [Event in keyof ClientEvents]: EventHandler<Event>[]
  }> = {}
  eventDisposers: Partial<{ [Event in keyof ClientEvents]: () => void }> = {}

  constructor(options: DiscordClientOptions) {
    super(options)
  }

  listenTo<Event extends keyof ClientEvents>(
    event: Event,
    handler: EventHandler<Event>,
  ) {
    this.#eventHandlers[event] ??= []
    this.#eventHandlers[event]?.push(handler)

    // Start listening to the event if it's not already listening
    if (!this.eventDisposers[event]) {
      const globalHandler = async (...args: ClientEvents[Event]) => {
        await Promise.all(
          this.#eventHandlers[event]?.map((l) => l(...args)) ?? [],
        )
      }

      super.on(event, globalHandler)

      this.eventDisposers[event] = () => {
        super.off(event, globalHandler)
      }
    }

    return () => this.stopListeningTo(event, handler)
  }

  stopListeningTo<Event extends keyof ClientEvents>(
    event: Event,
    handler: EventHandler<Event>,
  ) {
    // @ts-expect-error weird type error bug?
    this.#eventHandlers[event] =
      this.#eventHandlers[event]?.filter((l) => l !== handler) ?? []

    // Remove the event listener if there are no more listeners
    if (this.#eventHandlers[event]?.length === 0) {
      this.eventDisposers[event]?.()
      delete this.eventDisposers[event]
    }
  }
}

export class Client extends EventMergerClient {
  token: string
  devGuildId?: string
  clientId?: string

  commands: CommandBase[]
  #interactionsDisposer?: () => void
  messageRenderOptions: MessageRenderOptions = {
    unmountAfter: 5 * 60,
  }

  constructor({
    token,
    devGuildId,
    clientId,
    messageRenderOptions,
    commands,
    ...options
  }: ClientOptions) {
    super(options)

    this.token = token
    this.devGuildId = devGuildId
    this.clientId = clientId

    this.commands = commands ?? []

    this.#listenToInteractions()
  }

  #listenToInteractions() {
    const interactionsHandler = (interaction: Interaction) => {
      if (!interaction.isCommand()) return

      const command = this.commands.find(
        (c) => c.data.name === interaction.commandName,
      )
      if (!command) return

      command.handleInteraction(interaction)
    }

    this.on("interactionCreate", interactionsHandler)

    this.#interactionsDisposer = () => {
      this.removeListener("interactionCreate", interactionsHandler)
    }

    return this
  }

  async refreshCommands() {
    this.commands.forEach((c) => c.setDiscordClient(this))

    await refreshCommands(
      this.token,
      this.commands,
      this.clientId,
      this.devGuildId,
    )

    return this
  }

  async connect(callback: (client: DiscordClient) => void) {
    this.on("ready", callback)
    await this.refreshCommands()
    await this.login(this.token)

    return this
  }

  async disconnect() {
    this.#interactionsDisposer?.()
    this.destroy()
    return this
  }

  registerCommand(command: CommandBase) {
    this.commands.push(command)

    return this
  }

  registerCommands(commands: CommandBase[]) {
    this.commands.push(...commands)

    return this
  }
}

export const createClient = (options: ClientOptions) => new Client(options)
