import { render } from "../render"
import {
	SlashCommandBuilder,
	type SlashCommandInteraction,
} from "./command-builder"
import { CommandProvider, createUseCommandContext } from "./command-provider"

export const createSlashCommand = <Params = object, LoaderData = never>(
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
		loader?: (
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

			const loaderData = await loader?.(interaction)
			if (Component) {
				render(
					() => (
						<CommandProvider interaction={interaction} loaderData={loaderData}>
							<Component
								interaction={interaction}
								// @ts-expect-error - generic type inference
								loaderData={loaderData}
							/>
						</CommandProvider>
					),
					{
						interactionRef: interaction,
						messageRenderOptions: {},
					},
				)
			}
		},
		useCommandContext: createUseCommandContext<Params, LoaderData>(),
	}
}
