import { type Component } from "@effect/ui";
import { Schema, type Layer } from "effect";
import { renderMessage } from "../render";
import * as Discord from "../vocabulary";
import { SlashCommandBuilder, type SlashCommandInteraction } from "./command-builder";
import { CommandProvider } from "./command-provider";

export interface SlashCommandOptions<Params = object> {
  readonly command:
    | InstanceType<typeof SlashCommandBuilder<Params>>
    | ((
        command: InstanceType<typeof SlashCommandBuilder>,
      ) => InstanceType<typeof SlashCommandBuilder<Params>>);
  readonly component?: Component.Any;
  /** Layers the command component needs, such as Query or Command services. */
  readonly layer?: Layer.Layer<any, any, any> | undefined;
}

const createCommandHost = (component: Component.Any) =>
  Discord.component({
    name: "CommandHost",
    props: Schema.Struct({
      interaction: Schema.Unknown,
      params: Schema.Unknown,
    }),
    model: Schema.Struct({}),
    message: Schema.Never,
  }).make({
    init: () => ({}),
    update: ($) => $.model,
    view: (h) =>
      CommandProvider(h, {
        props: {
          interaction: h.props.interaction as never,
        },
        view: () => component(h as never, { props: h.props.params } as never),
      }),
  });

export const createSlashCommand = <Params = object>(
  name: string,
  { command, component, layer }: SlashCommandOptions<Params>,
) => {
  const Host = component ? createCommandHost(component) : null;

  return {
    name,
    command: (command instanceof SlashCommandBuilder
      ? command
      : command(new SlashCommandBuilder<Params>())
    ).setName(name),
    handler: async (interaction: SlashCommandInteraction<Params>) => {
      if (interaction.commandName !== name) return;

      if (Host && component) {
        await renderMessage(
          interaction,
          Host,
          {
            interaction,
            params: interaction.params,
          },
          { layer },
        );
      }
    },
  };
};
