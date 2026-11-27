import { mountBotMessage } from "@arona/core";
import type { Component, View } from "@effect/ui";
import { Effect, Layer, type Layer as LayerType } from "effect";
import { create as createHost, type SlackHost, layerFor as hostLayerFor } from "./host";
import type { SlackMessageRoot } from "./root";
import { SlackMessageTarget, MessageTarget } from "./target";
import type {
  MessageRenderOptions,
  SlackActionPayload,
  SlackBlock,
  SlackMessage,
  SlackMessageRef,
  SlackWebClient,
} from "./types";

/** Message rendering options plus the Web API client and Layers to use. */
export interface MountMessageOptions extends MessageRenderOptions {
  /** Defaults to the client attached to an Arona Slack message. */
  readonly client?: SlackWebClient;
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

const webClientOf = (ref: SlackMessageRef, options: MountMessageOptions): SlackWebClient => {
  const client = options.client ?? ref.arona?.client.client;
  if (!client) {
    throw new Error(
      "Slack messages must be rendered from an AronaSlackClient message or with an explicit client",
    );
  }
  return client;
};

/**
 * Mounts an Effect UI component into a Slack thread and resolves with the
 * created message once the first Block Kit render has been sent.
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
  ref: SlackMessageRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
): Promise<{ message: SlackMessage; root: SlackMessageRoot }> => {
  const client = webClientOf(ref, options);
  const target = new SlackMessageTarget(client, ref, options);
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
    SlackHost,
    SlackMessage,
    ReadonlyArray<SlackBlock>,
    SlackActionPayload,
    Props
  >({
    component,
    props,
    host,
    target,
    container: host.container,
    layer,
    onInteraction: async (payload) => {
      await host.dispatchInteraction(payload);
    },
    client: ref.arona?.client,
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
  ref: SlackMessageRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
) =>
  Effect.acquireRelease(
    Effect.promise(() => mountMessage(ref, component, props, options)),
    ({ root }) => root.close(),
  );

/** Renders a component into a Slack message and resolves with the message. */
export const renderMessage = async <
  Name extends string,
  Props,
  Model,
  Msg,
  Events,
  R,
  V extends View.Elements,
>(
  ref: SlackMessageRef,
  component: AnyComponent<Name, Props, Model, Msg, Events, R, V>,
  props: Props,
  options: MountMessageOptions = {},
): Promise<SlackMessage> => {
  const { message } = await mountMessage(ref, component, props, options);
  return message;
};

/** @deprecated Use `mountMessage` when you need the root. */
export const render = mountMessage;
