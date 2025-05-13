import { type ReactNode, createContext, useContext, useState } from "react"
import type { SlashCommandInteraction } from "./command-builder"

export interface ICommandContext<Params = {}, LoaderData = null> {
  interaction: SlashCommandInteraction<Params>
  loaderData: LoaderData
}

const commandContext = createContext<ICommandContext>({
  interaction: null,
  loaderData: null,
})

export function createUseCommandContext<Params = {}, LoaderData = null>() {
  return () => {
    const context = useContext(commandContext)
    if (!context) {
      throw new Error("useCommandContext must be used within a CommandProvider")
    }

    return context as ICommandContext<Params, LoaderData>
  }
}

interface CommandProviderProps {
  children: ReactNode
  interaction
  loaderData
}

export const CommandProvider = ({
  children,
  interaction,
  loaderData,
}: CommandProviderProps) => {
  return (
    <commandContext.Provider value={{ interaction, loaderData }}>
      {children}
    </commandContext.Provider>
  )
}
