import { mountBotMessage } from "@arona/core";
import { type Component, type View } from "@effect/ui";
import { Effect, Layer, type Layer as LayerType } from "effect";
import { create as createHost, type DiscordHost, layerFor as hostLayerFor } from "./host";
import type { DiscordMessageRoot } from "./root";
import { DiscordMessageTarget, MessageTarget } from "./target";
import type { InteractionRef, MessageRenderOptions } from "./types";

/** Message rendering options plus Layers for the component tree. */
export interface MountMessageOptions extends MessageRenderOptions {
  readonly layer?: LayerType.Layer<any, any, any> | undefined;
}

type AnyComponent<
  Name extends string = string,
  Props = any,
  Model = any,
  Msg = any,
  Events = any,
  R = any,
  V extends View.Elements = View.Elements,
> = Component.Members<Name, Props, Model, Msg, Events, R, V, any>;

interface RootClient {
  addRoot(root: DiscordMessageRoot): unknown;
  removeInteractionListener(uuid: string): unknown;
}

const clientOf = (ref: InteractionRef): RootClient | undefined => {
  const client = (ref as unknown as { client?: RootClient }).client;
  return client?.addRoot ? client : undefined;
};

/**
 * Mounts an Effect UI component into a Discord message and resolves with the
 * created message once the first render has been sent.
 */
export const mountMessage = async <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
>(
  ref: InteractionRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
): Promise<{ message: import("discord.js").Message; root: DiscordMessageRoot }> => {
  const target = new DiscordMessageTarget(ref, options);
  const host = createHost(
    target,
    options.telemetry === undefined ? {} : { telemetry: options.telemetry },
  );
  const layer = Layer.mergeAll(
    MessageTarget.fromTarget(target),
    hostLayerFor(host),
    options.layer ?? Layer.empty,
  );

  return mountBotMessage<
    DiscordHost,
    import("discord.js").Message,
    import("./types").MessageSnapshot,
    import("discord.js").Interaction,
    Props
  >({
    component,
    props,
    host,
    target,
    container: host.container,
    layer,
    onInteraction: async (interaction) => {
      await host.dispatchInteraction(interaction);
    },
    client: clientOf(ref),
    ref,
    renderOptions: options,
    ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
  });
};

/**
 * Scoped Effect form of `mountMessage`: the message root is closed when the
 * surrounding Scope closes.
 */
export const mountMessageScoped = <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
>(
  ref: InteractionRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
) =>
  Effect.acquireRelease(
    Effect.promise(() => mountMessage(ref, component, props, options)),
    ({ root }) => root.close(),
  );

/** Renders a component into a Discord message and resolves with the message. */
export const renderMessage = async <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
>(
  ref: InteractionRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
): Promise<import("discord.js").Message> => {
  const { message } = await mountMessage(ref, component, props, options);
  return message;
};

/** @deprecated Use `mountMessage` when you need the root. */
export const render = mountMessage;
