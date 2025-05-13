import { CommandProvider, createUseCommandContext } from "./command-provider"
import {
  SlashCommandBuilder,
  type SlashCommandInteraction,
} from "./command-builder"
import { render } from "../renderer/render"

export const createSlashCommand = <
  Params = {},
  LoaderData extends unknown = void,
>(
  name: string,
  {
    command,
    loader,
    component: Component,
  }: {
    command:
      | InstanceType<typeof SlashCommandBuilder<Params>>
      | ((
          command: InstanceType<typeof SlashCommandBuilder>,
        ) => InstanceType<typeof SlashCommandBuilder<Params>>)
    loader: (
      interaction: SlashCommandInteraction<Params>,
    ) => Promise<LoaderData>
    component?: (props: {
      interaction: SlashCommandInteraction<Params>
      loaderData: LoaderData
    }) => JSX.Element
  },
) => {
  return {
    name,
    command: (command instanceof SlashCommandBuilder
      ? command
      : command(new SlashCommandBuilder())
    ).setName(name),
    handler: async (interaction: SlashCommandInteraction<Params>) => {
      const { commandName } = interaction
      if (commandName !== name) return

      const loaderData = await loader(interaction)
      if (Component) {
        render(
          () => (
            <CommandProvider interaction={interaction} loaderData={loaderData}>
              <Component interaction={interaction} loaderData={loaderData} />
            </CommandProvider>
          ),
          interaction,
          {},
        )
      }
    },
    useCommandContext: createUseCommandContext<Params, LoaderData>(),
  }
}
