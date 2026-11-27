import {
  mountBotMessage,
  makeSessionId,
  type MessageSession,
  type MessageSessionStoreShape,
} from "@arona/core";
import { type Component, type Renderer, type View } from "@effect/ui";
import { Effect, Exit, Layer, Option, type Layer as LayerType } from "effect";
import { create as createHost, type DiscordHost, layerFor as hostLayerFor } from "./host";
import type { DiscordMessageRoot } from "./root";
import { DiscordMessageTarget, MessageTarget } from "./target";
import type { InteractionRef, MessageRenderOptions } from "./types";

/** Message rendering options plus Layers for the component tree. */
export interface MountMessageOptions extends MessageRenderOptions {
  readonly layer?: LayerType.Layer<any, any, any> | undefined;
  /** Models from `Root.snapshot` to resume from. */
  readonly state?: Renderer.State | undefined;
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
  registerComponent?(key: string, component: Component.Any): unknown;
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
    ...(options.state === undefined ? {} : { state: options.state }),
    ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
  });
};

/** Options for a message whose state is persisted between processes. */
export interface SessionMountOptions extends MountMessageOptions {
  readonly store: MessageSessionStoreShape;
  /** Key the client uses to resolve the component again after a restart. */
  readonly componentKey: string;
  /** Resume an existing record. Without it a new record is created. */
  readonly session?: MessageSession | undefined;
  /** Props to persist; defaults to the live `props` argument. */
  readonly sessionProps?: unknown;
  /** Application build fingerprint. Empty means "do not check". */
  readonly build?: string;
  readonly id?: string;
  readonly ttl?: number;
}

/**
 * Mounts a message backed by a `MessageSessionStore`.
 *
 * The first mount creates the session, sends the message and stores its
 * initial state. A later process can pass the loaded session plus
 * `resume: message` to rebuild the same tree without calling `init`, then
 * persist the state after each interaction.
 */
export const mountSessionMessage = async <
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
  options: SessionMountOptions,
): Promise<{
  message: import("discord.js").Message;
  root: DiscordMessageRoot;
  session: MessageSession;
}> => {
  const store = options.store;
  let session = options.session;
  if (session === undefined) {
    const now = Date.now();
    session = {
      id: options.id ?? makeSessionId(),
      version: 0,
      status: "pending",
      component: options.componentKey,
      build: options.build ?? "",
      props: options.sessionProps ?? props,
      state: undefined,
      ephemeral: options.ephemeral ?? false,
      createdAt: now,
      updatedAt: now,
      ...(options.ttl === undefined ? {} : { expiresAt: now + options.ttl }),
    };
    await Effect.runPromise(store.create(session));
  }

  const target = new DiscordMessageTarget(ref, options);
  const host = createHost(
    target,
    options.telemetry === undefined ? {} : { telemetry: options.telemetry },
  );
  host.setSession({ id: session.id, version: session.version });

  const layer = Layer.mergeAll(
    MessageTarget.fromTarget(target),
    hostLayerFor(host),
    options.layer ?? Layer.empty,
  );

  const client = clientOf(ref);
  client?.registerComponent?.(options.componentKey, component as never);

  let current = session;
  let pending: Promise<void> = Promise.resolve();

  const { message, root } = await mountBotMessage<
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
    onInteraction: (interaction, mounted) => {
      // Interactions on one root are serialized: a second click must not
      // snapshot state before the first one has been stored.
      const run = pending.then(async () => {
        const before = host.commits;
        host.setSessionVersion(current.version + 1);
        const handled = await host.dispatchInteraction(interaction);
        if (!handled || host.commits === before) {
          host.setSessionVersion(current.version);
          return;
        }

        const state = await Effect.runPromise(mounted.snapshot());
        current = await Effect.runPromise(
          store.update(current.id, current.version, (stored) => ({
            ...stored,
            status: "active",
            state,
          })),
        );
        mounted.setSessionVersion(current.version);
        host.setSessionVersion(current.version);
      });
      pending = run.catch(() => {});
      return run;
    },
    client,
    ref,
    renderOptions: options,
    ...(session.state === undefined ? {} : { state: session.state }),
    session: { id: session.id, version: session.version },
    ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
  });

  // A very fast interaction can race these two writes. The store is the
  // source of truth, so on a conflict keep the record the interaction stored.
  const refresh = async (fallback: MessageSession): Promise<MessageSession> => {
    const latest = await Effect.runPromise(store.get(fallback.id));
    return Option.isSome(latest) ? latest.value : fallback;
  };

  if (current.message?.id !== message.id) {
    const channelId = (message as { channelId?: string }).channelId;
    const guildId = (message as { guildId?: string }).guildId;
    const attached = await Effect.runPromise(
      Effect.exit(
        store.attachMessage(current.id, {
          id: message.id,
          ...(channelId === undefined ? {} : { channelId }),
          ...(guildId === undefined ? {} : { guildId }),
        }),
      ),
    );
    current = Exit.isSuccess(attached) ? attached.value : await refresh(current);
  }

  if (current.state === undefined) {
    const state = await Effect.runPromise(root.snapshot());
    const stored = await Effect.runPromise(
      Effect.exit(store.setState(current.id, current.version, state)),
    );
    current = Exit.isSuccess(stored) ? stored.value : await refresh(current);
  }

  root.setSessionVersion(current.version);
  host.setSessionVersion(current.version);

  return { message, root, session: current };
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
