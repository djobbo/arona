import {
  type ChatInputCommandInteraction,
  type CommandInteraction,
  SlashCommandStringOption,
} from "discord.js"
import {
  Client,
  SlashCommandBuilder as DJSSlashCommandBuilder,
  Events,
  GatewayIntentBits,
  REST,
  Routes,
} from "discord.js"
import type { ReactNode } from "react"

const app = {
  id: process.env.DISCORD_APP_ID!,
  token: process.env.DISCORD_APP_TOKEN!,
  devGuildId: process.env.DISCORD_DEV_GUILD_ID!,
}

type SlashCommandOptions = Record<string, unknown>

class SlashCommandBuilder<
  Options extends SlashCommandOptions = Record<never, never>,
> extends DJSSlashCommandBuilder {
  constructor() {
    super()
  }

  addTypedStringOption<Name extends string>(
    name: Name,
    ...[options, ...args]: Parameters<
      InstanceType<typeof DJSSlashCommandBuilder>["addStringOption"]
    >
  ) {
    const typeSafeOptions =
      options instanceof SlashCommandStringOption
        ? options.setName(name)
        : options(new SlashCommandStringOption()).setName(name)

    return super.addStringOption(
      typeSafeOptions,
      ...args,
    ) as SlashCommandBuilder<Options & { [key in Name]: string }>
  }
}

const AronaClient = Client

const client = new AronaClient({
  intents: [GatewayIntentBits.Guilds],
})

client.once(Events.ClientReady, (readyClient) => {
  console.log(`🚀 Logged in as ${client.user?.tag}`)
})

interface SlashCommandInteraction<Options extends SlashCommandOptions>
  extends ChatInputCommandInteraction {
  params: Options
}

const createSlashCommand = <
  Options extends Record<string, unknown> = {},
  LoaderData extends unknown = void,
>(
  name: string,
  {
    command,
    loader,
    component,
  }: {
    command:
      | InstanceType<typeof SlashCommandBuilder<Options>>
      | ((
          command: InstanceType<typeof SlashCommandBuilder<Options>>,
        ) => InstanceType<typeof SlashCommandBuilder<Options>>)
    loader: (
      interaction: SlashCommandInteraction<Options>,
    ) => Promise<LoaderData>
    component?: ReactNode
  },
) => {
  return {
    command: (command instanceof SlashCommandBuilder
      ? command
      : command(new SlashCommandBuilder())
    ).setName(name),
    handler: async (interaction: SlashCommandInteraction<Options>) => {
      const { commandName } = interaction
      if (commandName !== name) return

      const loaderData = await loader(interaction)
      if (component) {
        render(
          <CommandContext interaction={interaction} loaderData={loaderData}>
            {component}
          </CommandContext>,
        )
      }
    },
  }
}

const command = createSlashCommand("ping", {
  command: (command) =>
    command
      .setDescription("Replies with Pong!")
      .addTypedStringOption("input", (option) =>
        option.setDescription("The input to echo back").setRequired(true),
      ),
  loader: async (interaction) => {
    console.log("Interaction", interaction.params)
  },
  component: <>Hello World</>,
})

const commands = [command]

const rest = new REST().setToken(app.token)

const reloadCommands = async (commands: SlashCommandBuilder[]) => {
  try {
    console.log(
      `⏳ Started refreshing ${commands.length} application (/) commands.`,
    )

    // The put method is used to fully refresh all commands in the guild with the current set
    const data = await rest.put(
      Routes.applicationGuildCommands(app.id, app.devGuildId),
      { body: commands },
    )

    console.log(
      `✅ Successfully reloaded ${data.length} application (/) commands.`,
    )
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error)
  }
}

await reloadCommands(commands)

await client.login(app.token)

if (import.meta.hot) {
  import.meta.hot.accept(() => {
    console.log("♻️ index.ts updated")
  })

  import.meta.hot.dispose(() => {
    console.log("🧹 index.ts dispose")
  })
}
