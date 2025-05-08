import {
  Client,
  type ClientEvents,
  type ClientOptions,
  type Interaction,
} from "discord.js"
import { getTypedInteraction } from "../command/command-builder"
import { reloadCommands } from "../command/helpers/reload-commands"
import type { createSlashCommand } from "../command/create-slash-command"

interface AronaClientOptions extends ClientOptions {
  token: string
  clientId: string
  devGuildId?: string
  messageRenderOptions?: {
    unmountAfter?: number | null
    ephemeral?: boolean
  }
}

export class AronaClient extends Client {
  #token: string
  #devGuildId?: string
  #clientId: string
  #commands = new Map<
    string,
    Omit<ReturnType<typeof createSlashCommand>, "name">
  >()
  #interactionListeners = new Map<
    string,
    (interaction: Interaction) => unknown
  >()

  constructor({ token, devGuildId, clientId, ...options }: AronaClientOptions) {
    super(options)

    this.#token = token
    this.#devGuildId = devGuildId
    this.#clientId = clientId
    super.on("interactionCreate", this.globalInteractionListener)
  }

  login() {
    this.reloadCommands()
    return super.login(this.#token)
  }

  reloadCommands() {
    reloadCommands({
      token: this.#token,
      devGuildId: this.#devGuildId,
      clientId: this.#clientId,
      commands: [...this.#commands].map(([, command]) => command.command),
    })
  }

  async destroy() {
    super.off("interactionCreate", this.globalInteractionListener)
    this.#interactionListeners.clear()
    super.destroy()
  }

  globalInteractionListener: (interaction: Interaction) => unknown = (
    interaction,
  ) => {
    if (interaction.isCommand()) {
      const command = this.#commands.get(interaction.commandName)
      if (command) {
        if (!interaction.isChatInputCommand()) {
          throw new Error(
            `Command type ${interaction.type} is not yet supported`,
          )
        }

        command.handler(getTypedInteraction(command.command, interaction))
      }
    }

    this.#interactionListeners.forEach((listener) => {
      listener(interaction)
    })
  }

  addInteractionListener(
    key: string,
    listener: (...args: ClientEvents["interactionCreate"]) => void,
  ) {
    this.#interactionListeners.set(key, listener)
    return this
  }

  removeInteractionListener(key: string) {
    this.#interactionListeners.delete(key)
    return this
  }

  addCommand({ name, ...command }: ReturnType<typeof createSlashCommand>) {
    this.#commands.set(name, command)
    return this
  }

  addCommands(commands: Array<ReturnType<typeof createSlashCommand>>) {
    commands.forEach((command) => {
      this.#commands.set(command.name, command)
    })
    return this
  }

  removeCommand(name: string) {
    this.#commands.delete(name)
    return this
  }
}
