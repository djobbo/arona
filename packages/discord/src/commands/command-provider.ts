import { type View } from "@effect/ui";
import { Schema } from "effect";
import * as Discord from "../vocabulary";
import type { SlashCommandInteraction } from "./command-builder";

/** What a command component reads from its surrounding `CommandProvider`. */
export interface CommandContext<Params = object> {
  readonly interaction: SlashCommandInteraction<Params>;
}

const CommandProps = Schema.Struct({
  interaction: Schema.Unknown,
});

export interface CommandProviderProps {
  readonly interaction: SlashCommandInteraction<object>;
}

/**
 * Shares the interaction with every component rendered inside the command's
 * view. Readers declare `reads: { command: CommandProvider }`.
 */
export const CommandProvider = Discord.component({
  name: "CommandProvider",
  props: CommandProps,
  model: Schema.Struct({}),
  message: Schema.Never,
  shares: ({ props }) => props as CommandProviderProps,
}).make({
  init: () => ({}),
  update: ($) => $.model,
});

/** Narrows a provider value to the command's parameter type. */
export const commandContext = <Params = object>(
  context: CommandProviderProps,
): CommandContext<Params> => context as CommandContext<Params>;

export type CommandView<Msg> = View.WithTags<Msg, unknown, Discord.Elements>;
