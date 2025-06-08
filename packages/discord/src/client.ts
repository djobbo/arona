import { Client, type ClientOptions, type Interaction } from "discord.js"
import { getTypedInteraction } from "./commands/command-builder"
import type { createSlashCommand } from "./commands/create-slash-command"
import { reloadCommands } from "./commands/helpers/reload-commands"
import type { DiscordRootNode } from "./discord-root-node"

export interface DiscordClientOptions extends ClientOptions {
	token: string
	clientId: string
	devGuildId?: string
	messageRenderOptions?: {
		unmountAfter?: number | null
		ephemeral?: boolean
	}
}

export class DiscordClient extends Client {
	#token: string
	#devGuildId?: string
	#clientId: string
	#commands = new Map<
		string,
		Omit<ReturnType<typeof createSlashCommand>, "name">
	>()
	#interactionRoots = new Map<string, DiscordRootNode>()

	constructor({
		token,
		devGuildId,
		clientId,
		...options
	}: DiscordClientOptions) {
		console.log("🌱 Initializing Arona...")
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
		for (const root of this.#interactionRoots.values()) {
			root.unmount()
		}
		this.#interactionRoots.clear()
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

		for (const root of this.#interactionRoots.values()) {
			root.interactionListener(interaction)
		}
	}

	addRoot(root: DiscordRootNode) {
		this.#interactionRoots.set(root.uuid, root)
		return this
	}

	removeRoot(uuid: string) {
		this.#interactionRoots.delete(uuid)
		return this
	}

	addCommand({ name, ...command }: ReturnType<typeof createSlashCommand>) {
		this.#commands.set(name, command)
		return this
	}

	addCommands(commands: Array<ReturnType<typeof createSlashCommand>>) {
		for (const command of commands) {
			this.#commands.set(command.name, command)
		}
		return this
	}

	removeCommand(name: string) {
		this.#commands.delete(name)
		return this
	}
}
