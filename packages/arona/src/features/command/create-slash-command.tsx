import { CommandProvider } from "./command-provider"
import { SlashCommandBuilder } from "./command-builder"
import type { ReactNode } from "react"
import type { SlashCommandInteraction } from "./helpers/get-typed-interaction"

export const createSlashCommand = <
  Options = {},
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
          command: InstanceType<typeof SlashCommandBuilder>,
        ) => InstanceType<typeof SlashCommandBuilder<Options>>)
    loader: (
      interaction: SlashCommandInteraction<Options>,
    ) => Promise<LoaderData>
    component?: ReactNode
  },
) => {
  return {
    name,
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
          <CommandProvider interaction={interaction} loaderData={loaderData}>
            {component}
          </CommandProvider>,
        )
      }
    },
  }
}
