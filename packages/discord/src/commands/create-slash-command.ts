import type { MessageSessionStoreShape } from "@arona/core";
import { type Component } from "@effect/ui";
import { Schema, type Layer } from "effect";
import { mountSessionMessage, renderMessage } from "../render";
import * as Discord from "../vocabulary";
import { SlashCommandBuilder, type SlashCommandInteraction } from "./command-builder";
import { CommandProvider } from "./command-provider";

interface SessionClient {
  readonly sessions?: MessageSessionStoreShape | undefined;
  readonly build?: string | undefined;
  registerComponent?(
    key: string,
    component: Component.Any,
    options?: { readonly decodeProps?: (props: unknown, interaction: unknown) => unknown },
  ): unknown;
}

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
  const decodeProps = (stored: unknown, current: unknown) => ({
    interaction: current,
    params: (stored as { params?: unknown } | undefined)?.params,
  });

  return {
    name,
    command: (command instanceof SlashCommandBuilder
      ? command
      : command(new SlashCommandBuilder<Params>())
    ).setName(name),
    ...(Host === null || component === undefined
      ? {}
      : { session: { key: name, component: Host as never, decodeProps } }),
    handler: async (interaction: SlashCommandInteraction<Params>) => {
      if (interaction.commandName !== name) return;

      if (Host && component) {
        const client = (interaction as { client?: SessionClient }).client;
        if (client?.sessions !== undefined) {
          client.registerComponent?.(name, Host, { decodeProps });
          await mountSessionMessage(
            interaction,
            Host,
            {
              interaction,
              params: interaction.params,
            },
            {
              store: client.sessions,
              componentKey: name,
              sessionProps: { params: interaction.params },
              ...(client.build === undefined ? {} : { build: client.build }),
              ...(layer === undefined ? {} : { layer }),
            },
          );
        } else {
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
      }
    },
  };
};
