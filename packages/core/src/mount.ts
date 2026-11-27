import { type Component, Renderer } from "@effect/ui";
import { Effect, Fiber, type Layer as LayerType } from "effect";
import {
  BotMessageRoot,
  type MessageRenderOptions,
  type MessageRootClient,
  type MessageTarget,
  type RootSession,
} from "./message";
import { Telemetry, TelemetryMetrics, TelemetrySpans, type TelemetryHandle } from "./telemetry";

type AnyComponent = Component.Members<string, any, any, any, any, any, any, any>;

export interface MountBotMessageOptions<Host, Message, Snapshot, Interaction, Props> {
  readonly component: AnyComponent;
  readonly props: Props;
  readonly host: Host;
  readonly target: MessageTarget<Message, Snapshot>;
  readonly container: unknown;
  /** Renderer, host and application layers for this message. */
  readonly layer: LayerType.Layer<any, any, any>;
  readonly onInteraction: (
    interaction: Interaction,
    root: BotMessageRoot<Host, Message, Snapshot, Interaction>,
  ) => Promise<void>;
  readonly client: MessageRootClient | undefined;
  readonly ref: unknown;
  readonly renderOptions: MessageRenderOptions;
  /** Models from `Root.snapshot` to resume instead of calling `init`. */
  readonly state?: Renderer.State | undefined;
  /** Binds the root to a resumable message session. */
  readonly session?: RootSession | undefined;
  readonly telemetry?: TelemetryHandle | undefined;
}

const platformOf = (host: unknown): string => {
  const platform = (host as { platform?: unknown } | null | undefined)?.platform;
  return typeof platform === "string" ? platform : "unknown";
};

const componentNameOf = (component: unknown): string => {
  const name = (component as { name?: unknown } | null | undefined)?.name;
  return typeof name === "string" ? name : "unknown";
};

/**
 * Shared message lifecycle for node-based bot platforms.
 *
 * It mounts the component tree in a fiber kept alive for the message, waits for
 * the platform target's first message, and returns an explicitly closable
 * root. Closing the root interrupts the fiber, which releases the renderer,
 * query cache and every Layer built for the message.
 */
export const mountBotMessage = async <Host, Message, Snapshot, Interaction, Props>(
  options: MountBotMessageOptions<Host, Message, Snapshot, Interaction, Props>,
): Promise<{
  message: Message;
  root: BotMessageRoot<Host, Message, Snapshot, Interaction>;
}> => {
  const { target, host, container, layer, onInteraction, client, ref } = options;
  const telemetry = options.telemetry ?? Telemetry.current();
  const platform = platformOf(host);
  const component = componentNameOf(options.component);

  let resolveMount: () => void = () => {};
  let rejectMount: (cause: unknown) => void = () => {};
  const mountReady = new Promise<void>((resolve, reject) => {
    resolveMount = resolve;
    rejectMount = reject;
  });

  let mounted: Renderer.Root<any, any> | undefined;

  const program = Effect.gen(function* () {
    mounted = yield* telemetry.withSpan(
      Renderer.mount(options.component, options.props, container, { state: options.state }),
      TelemetrySpans.messageMount,
      {
        attributes: {
          "messaging.system": platform,
          "arona.component": component,
        },
      },
    );
    resolveMount();
    yield* Effect.never;
  }).pipe(
    Effect.provide(layer),
    Effect.scoped,
    Effect.catchCause((cause) =>
      Effect.sync(() => rejectMount(cause)).pipe(Effect.andThen(Effect.die(cause))),
    ),
  ) as Effect.Effect<never, never, never>;

  const fiber = telemetry.runFork(program);

  const fail = async (error: unknown): Promise<never> => {
    telemetry.counter(TelemetryMetrics.messageErrors, 1, {
      "messaging.system": platform,
      "arona.component": component,
      "arona.stage": "mount",
    });
    target.close();
    await Effect.runPromise(Fiber.interrupt(fiber));
    throw error;
  };

  try {
    await mountReady;
  } catch (error) {
    return fail(error);
  }

  let message: Message;
  try {
    message = await target.ready;
  } catch (error) {
    return fail(error);
  }

  telemetry.counter(TelemetryMetrics.messagesMounted, 1, {
    "messaging.system": platform,
    "arona.component": component,
  });

  const root: BotMessageRoot<Host, Message, Snapshot, Interaction> = new BotMessageRoot<
    Host,
    Message,
    Snapshot,
    Interaction
  >({
    fiber,
    host,
    target,
    ref,
    renderOptions: options.renderOptions,
    client,
    interaction: onInteraction,
    snapshot: () =>
      mounted === undefined ? Effect.die(new Error("Message is not mounted")) : mounted.snapshot,
    ...(options.session === undefined ? {} : { session: options.session }),
    telemetry,
  });
  client?.addRoot?.(root);

  return { message, root };
};
