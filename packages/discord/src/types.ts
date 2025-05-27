import type { Interaction } from "discord.js"

export type InteractionListener = (interaction: Interaction) => void
export type InteractionListenerEntry = [string, InteractionListener]
