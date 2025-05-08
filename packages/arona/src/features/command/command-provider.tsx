import { type ReactNode, createContext, use } from "react"

interface ICommandContext {
  interaction
  loaderData
}

const commandContext = createContext<ICommandContext>({
  interaction: null,
  loaderData: null,
})

export const useCommandContext = () => {
  const context = use(commandContext)
  if (!context) {
    throw new Error("useCommandContext must be used within a CommandProvider")
  }

  return context
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
