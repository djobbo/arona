import {
  ApplicationCommandOptionType,
  SlashCommandBuilder as DJSSlashCommandBuilder,
  SlashCommandBooleanOption,
  SlashCommandStringOption,
  SlashCommandUserOption,
} from "discord.js"
import type {
  ChatInputCommandInteraction,
  CommandInteraction,
  SlashCommandOptionsOnlyBuilder,
  User,
} from "discord.js"

export const getTypedInteraction = <Params = {}>(
  command: SlashCommandBuilder<Params>,
  interaction: ChatInputCommandInteraction,
): SlashCommandInteraction<Params> => {
  const params = command.params.reduce(
    (acc, { name, type }) => {
      let value = null
      switch (type) {
        case ApplicationCommandOptionType.String:
          value = interaction.options.getString(name)
          break
        case ApplicationCommandOptionType.Boolean:
          value = interaction.options.getBoolean(name)
          break
        case ApplicationCommandOptionType.User:
          value = interaction.options.getUser(name) as User
          break
        default:
          value = interaction.options.get(name)?.value
          break
      }
      acc[name] = value
      return acc
    },
    {} as Record<string, unknown>,
  )

  ;(interaction as SlashCommandInteraction).params = params
  return interaction as SlashCommandInteraction<Params>
}

export class SlashCommandBuilder<Params = {}> extends DJSSlashCommandBuilder {
  params: { name: string; type: ApplicationCommandOptionType }[] = []

  constructor() {
    super()
  }

  /**
   * @deprecated Use `addTypedStringOption` instead
   */
  addStringOption(
    ...args: Parameters<SlashCommandOptionsOnlyBuilder["addStringOption"]>
  ) {
    super.addStringOption(...args)
    return this
  }

  addTypedStringOption<Name extends string>(
    name: Name,
    ...[options, ...args]: Parameters<
      InstanceType<typeof DJSSlashCommandBuilder>["addStringOption"]
    >
  ): SlashCommandBuilder<
    Params & {
      [K in Name]: string
    }
  > {
    const typeSafeOptions =
      options instanceof SlashCommandStringOption
        ? options.setName(name)
        : options(new SlashCommandStringOption()).setName(name)

    super.addStringOption(typeSafeOptions, ...args)
    this.params.push({ name, type: ApplicationCommandOptionType.String })
    return this
  }

  addTypedBooleanOption<Name extends string>(
    name: Name,
    ...[options, ...args]: Parameters<
      InstanceType<typeof DJSSlashCommandBuilder>["addBooleanOption"]
    >
  ): SlashCommandBuilder<
    Params & {
      [K in Name]: boolean
    }
  > {
    const typeSafeOptions =
      options instanceof SlashCommandBooleanOption
        ? options.setName(name)
        : options(new SlashCommandBooleanOption()).setName(name)

    super.addBooleanOption(typeSafeOptions, ...args)
    this.params.push({ name, type: ApplicationCommandOptionType.Boolean })
    return this
  }

  addTypedUserOption<Name extends string>(
    name: Name,
    ...[options, ...args]: Parameters<
      InstanceType<typeof DJSSlashCommandBuilder>["addUserOption"]
    >
  ): SlashCommandBuilder<
    Params & {
      [K in Name]: ReturnType<ChatInputCommandInteraction["options"]["getUser"]>
    }
  > {
    const typeSafeOptions =
      options instanceof SlashCommandUserOption
        ? options.setName(name)
        : options(new SlashCommandUserOption()).setName(name)

    super.addUserOption(typeSafeOptions, ...args)
    this.params.push({ name, type: ApplicationCommandOptionType.User })
    return this
  }
}

export interface SlashCommandInteraction<Params = {}>
  extends ChatInputCommandInteraction {
  params: Params
}
