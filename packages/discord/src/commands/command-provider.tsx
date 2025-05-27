import { type ReactNode, createContext, useContext } from "react"
import type { SlashCommandInteraction } from "./command-builder"

export interface ICommandContext<Params = object, LoaderData = null> {
	interaction: SlashCommandInteraction<Params> | null
	loaderData: LoaderData
}

const commandContext = createContext<ICommandContext>({
	interaction: null,
	loaderData: null,
})

export function createUseCommandContext<Params = object, LoaderData = null>() {
	return () => {
		const context = useContext(commandContext)
		if (!context) {
			throw new Error("useCommandContext must be used within a CommandProvider")
		}

		return context as ICommandContext<Params, LoaderData>
	}
}

interface CommandProviderProps<Params = object, LoaderData = null> {
	children: ReactNode
	interaction: SlashCommandInteraction<Params> | null
	loaderData: LoaderData
}

export const CommandProvider = <Params = object, LoaderData = null>({
	children,
	interaction,
	loaderData,
}: CommandProviderProps<Params, LoaderData>) => {
	return (
		<commandContext.Provider
			value={{
				// @ts-expect-error - generic type inference
				interaction,
				// @ts-expect-error - generic type inference
				loaderData,
			}}
		>
			{children}
		</commandContext.Provider>
	)
}
