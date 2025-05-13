export { Client, createClient } from "./Client"
export {
  createSlashCommand,
  createMessageMenuCommand as createMessageContextMenuCommand,
  createUserMenuCommand as createUserContextMenuCommand,
} from "./Command"
export * from "./hooks"
export { renderMessage } from "./renderer"

export type ReaccordConfig = {
  /**
   * Entry point for the bot.
   */
  entry: string
}

export * from "./jsx"
