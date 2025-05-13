import {
  ApplicationCommandOptionType,
  ApplicationCommandType,
  ContextMenuCommandBuilder,
  SlashCommandAttachmentOption,
  SlashCommandBooleanOption,
  SlashCommandBuilder,
  SlashCommandChannelOption,
  SlashCommandIntegerOption,
  SlashCommandMentionableOption,
  SlashCommandNumberOption,
  SlashCommandRoleOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "discord.js"
import { EMPTY_STRING } from "./helpers/constants"
import { renderMessage } from "./renderer"
import type {
  ApplicationCommandOptionChoiceData,
  Channel,
  ChatInputCommandInteraction,
  CommandInteraction,
  CommandInteractionOptionResolver,
  ContextMenuCommandInteraction,
  ContextMenuCommandType,
  GuildMember,
  Role,
  User,
} from "discord.js"
import type { Client, MessageRenderOptions } from "./Client"

type CommandOptionChoiceData<
  ChoiceType extends string | number | never = never,
> = Omit<ApplicationCommandOptionChoiceData, "value"> & {
  value: ChoiceType
}

type CommandParamOptions<
  Required extends boolean = false,
  ChoiceType extends string | number | never = never,
> = {
  type: ApplicationCommandOptionType
  required?: Required
  choices?: CommandOptionChoiceData<ChoiceType>[]
}

export abstract class CommandBase<
  Type extends ApplicationCommandType = ApplicationCommandType,
  CommandData = Type extends ApplicationCommandType.ChatInput
    ? SlashCommandBuilder
    : Type extends ApplicationCommandType.User | ApplicationCommandType.Message
      ? ContextMenuCommandBuilder
      : never,
> {
  discordClient: Client | null = null
  data: CommandData

  constructor(commandData: CommandData) {
    this.data = commandData
  }

  setDiscordClient(client: Client) {
    this.discordClient = client
  }

  abstract handleInteraction(interaction: CommandInteraction): void
}

type ChatInputInteractionCallback<
  CommandOptions extends { [k in string]: any } = {},
  ReturnType = void,
> = (
  props: CommandOptions,
  interaction: ChatInputCommandInteraction,
) => ReturnType

const getOptionValue = (
  options: Omit<CommandInteractionOptionResolver, "getMessage" | "getFocused">,
  name: string,
  type: ApplicationCommandOptionType,
) => {
  switch (type) {
    case ApplicationCommandOptionType.Attachment:
      return options.getAttachment(name)
    case ApplicationCommandOptionType.Boolean:
      return options.getBoolean(name)
    case ApplicationCommandOptionType.Channel:
      return options.getChannel(name)
    case ApplicationCommandOptionType.Integer:
      return options.getInteger(name)
    case ApplicationCommandOptionType.Mentionable:
      return options.getMentionable(name)
    case ApplicationCommandOptionType.Number:
      return options.getNumber(name)
    case ApplicationCommandOptionType.Role:
      return options.getRole(name)
    case ApplicationCommandOptionType.String:
      return options.getString(name)
    case ApplicationCommandOptionType.User:
      return options.getUser(name)
    default:
      return options.get(name)
  }
}

class ChatInputCommand<
  CommandOptions extends { [k in string]: any } = {},
> extends CommandBase<ApplicationCommandType.ChatInput> {
  #options: { name: string; type: ApplicationCommandOptionType }[]
  #interactionCallback?: ChatInputInteractionCallback<CommandOptions>

  constructor(name: string, description: string) {
    const commandData = new SlashCommandBuilder()
      .setName(name)
      .setDescription(description ?? EMPTY_STRING)

    super(commandData)

    this.#options = []
  }

  registerParam<
    Name extends string,
    Type extends any,
    Required extends boolean,
  >({
    name,
    description,
    type,
    required,
    choices,
  }: CommandParamOptions<Required, string | number | never> & {
    name: Name
    type: ApplicationCommandOptionType
    description: string
  }): Omit<
    ChatInputCommand<
      CommandOptions & {
        [k in Name]: Required extends true ? Type : Type | undefined
      }
    >,
    "addSubcommand" | "addSubcommandGroup"
  > {
    this.#options.push({ name, type })

    switch (type) {
      case ApplicationCommandOptionType.Attachment:
        this.data.addAttachmentOption(
          new SlashCommandAttachmentOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      case ApplicationCommandOptionType.Boolean:
        this.data.addBooleanOption(
          new SlashCommandBooleanOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      case ApplicationCommandOptionType.Channel:
        this.data.addChannelOption(
          new SlashCommandChannelOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      case ApplicationCommandOptionType.Integer: {
        const option = new SlashCommandIntegerOption()
          .setName(name)
          .setDescription(description)
          .setRequired(required ?? false)

        if (choices) {
          option.setChoices(...(choices as CommandOptionChoiceData<number>[]))
        }

        this.data.addIntegerOption(option)
        break
      }
      case ApplicationCommandOptionType.Mentionable:
        this.data.addMentionableOption(
          new SlashCommandMentionableOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      case ApplicationCommandOptionType.Number: {
        const option = new SlashCommandNumberOption()
          .setName(name)
          .setDescription(description)
          .setRequired(required ?? false)

        if (choices) {
          option.setChoices(...(choices as CommandOptionChoiceData<number>[]))
        }

        this.data.addNumberOption(option)
        break
      }
      case ApplicationCommandOptionType.Role:
        this.data.addRoleOption(
          new SlashCommandRoleOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      case ApplicationCommandOptionType.String: {
        const option = new SlashCommandStringOption()
          .setName(name)
          .setDescription(description)
          .setRequired(required ?? false)

        if (choices) {
          option.setChoices(...(choices as CommandOptionChoiceData<string>[]))
        }

        this.data.addStringOption(option)
        break
      }
      case ApplicationCommandOptionType.User:
        this.data.addUserOption(
          new SlashCommandUserOption()
            .setName(name)
            .setDescription(description)
            .setRequired(required ?? false),
        )
        break
      default:
        throw new Error(`Unknown option type: ${type}`)
    }

    return this
  }

  boolParam<Name extends string, Required extends boolean>(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required>, "type" | "choices"> = {},
  ) {
    return this.registerParam<Name, boolean, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Boolean,
      ...options,
    })
  }

  channelParam<Name extends string, Required extends boolean>(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required>, "type" | "choices"> = {},
  ) {
    return this.registerParam<Name, Channel, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Channel,
      ...options,
    })
  }

  intParam<
    Name extends string,
    Required extends boolean,
    ChoicesType extends number,
  >(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required, ChoicesType>, "type"> = {},
  ) {
    return this.registerParam<Name, ChoicesType, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Integer,
      ...options,
    })
  }

  mentionParam<Name extends string, Required extends boolean>(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required>, "type" | "choices"> = {},
  ) {
    return this.registerParam<Name, GuildMember | Role | User, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Mentionable,
      ...options,
    })
  }

  numberParam<
    Name extends string,
    Required extends boolean,
    ChoicesType extends number,
  >(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required, ChoicesType>, "type"> = {},
  ) {
    return this.registerParam<Name, ChoicesType, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Number,
      ...options,
    })
  }

  roleParam<Name extends string, Required extends boolean>(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required>, "type" | "choices"> = {},
  ) {
    return this.registerParam<Name, Role, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.Role,
      ...options,
    })
  }

  stringParam<
    Name extends string,
    Required extends boolean,
    ChoicesType extends string,
  >(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required, ChoicesType>, "type"> = {},
  ) {
    return this.registerParam<Name, ChoicesType, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.String,
      ...options,
    })
  }

  userParam<Name extends string, Required extends boolean>(
    name: Name,
    description: string,
    options: Omit<CommandParamOptions<Required>, "type" | "choices"> = {},
  ) {
    return this.registerParam<Name, User, Required>({
      name,
      description,
      type: ApplicationCommandOptionType.User,
      ...options,
    })
  }

  render(
    callback: ChatInputInteractionCallback<CommandOptions, JSX.Element>,
    messageRenderOptions?: MessageRenderOptions,
  ) {
    this.#interactionCallback = async (props, interaction) => {
      if (!this.discordClient || !interaction.isChatInputCommand()) return

      await renderMessage(
        () => callback(props, interaction),
        this.discordClient,
        interaction,
        messageRenderOptions,
      )
    }
    return this
  }

  exec(callback: ChatInputInteractionCallback<CommandOptions>) {
    this.#interactionCallback = callback
    return this
  }

  handleInteraction(interaction: CommandInteraction): void {
    if (!interaction.isChatInputCommand()) return

    const { options } = interaction

    const props = Object.fromEntries(
      this.#options.map(({ name, type }) => [
        name,
        getOptionValue(options, name, type) ?? undefined,
      ]),
    ) as CommandOptions

    this.#interactionCallback?.(props, interaction)
  }
}

type ContextMenuInteractionCallback<ReturnType = void> = (
  interaction: ContextMenuCommandInteraction,
) => ReturnType

class ContextMenuCommand extends CommandBase<ContextMenuCommandType> {
  #interactionCallback?: ContextMenuInteractionCallback

  constructor(name: string, type: ContextMenuCommandType) {
    const data = new ContextMenuCommandBuilder().setName(name).setType(type)

    super(data)
  }

  render(
    callback: ContextMenuInteractionCallback<JSX.Element>,
    messageRenderOptions?: MessageRenderOptions,
  ) {
    this.#interactionCallback = async (interaction) => {
      if (!this.discordClient || !interaction.isContextMenuCommand()) return

      await renderMessage(
        () => callback(interaction),
        this.discordClient,
        interaction,
        messageRenderOptions,
      )
    }
    return this
  }

  exec(callback: ContextMenuInteractionCallback) {
    this.#interactionCallback = callback
    return this
  }

  handleInteraction(interaction: CommandInteraction): void {
    if (!interaction.isContextMenuCommand()) return

    this.#interactionCallback?.(interaction)
  }
}

export const createSlashCommand = (name: string, description: string) =>
  new ChatInputCommand(name, description)

export const createUserMenuCommand = (name: string) =>
  new ContextMenuCommand(name, ApplicationCommandType.User)

export const createMessageMenuCommand = (name: string) =>
  new ContextMenuCommand(name, ApplicationCommandType.Message)
