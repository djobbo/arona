import { randomUUID } from "node:crypto";
import { Effect, Fiber } from "effect";
import { Telemetry, TelemetryMetrics, TelemetrySpans, type TelemetryHandle } from "./telemetry";

export interface MessageRenderOptions {
  readonly ephemeral?: boolean;
  readonly unmountAfter?: number;
  /** Telemetry runtime for this message. Defaults to the process-wide runtime. */
  readonly telemetry?: TelemetryHandle | undefined;
}

/** What a platform target must provide to the shared message lifecycle. */
export interface MessageTarget<Message, Snapshot> {
  readonly ready: Promise<Message>;
  queue(snapshot: Snapshot): void;
  close(): void;
}

export interface MessageRootClient {
  addRoot?(root: BotMessageRoot<any, any, any, any>): unknown;
  removeInteractionListener(uuid: string): unknown;
}

export interface BotMessageRootOptions<Host, Message, Snapshot, Interaction> {
  readonly fiber: Fiber.Fiber<never, never>;
  readonly host: Host;
  readonly target: MessageTarget<Message, Snapshot>;
  readonly ref: unknown;
  readonly renderOptions: MessageRenderOptions;
  readonly client: MessageRootClient | undefined;
  readonly interaction: (interaction: Interaction) => Promise<void>;
  readonly telemetry?: TelemetryHandle | undefined;
}

const platformOf = (host: unknown): string => {
  const platform = (host as { platform?: unknown } | null | undefined)?.platform;
  return typeof platform === "string" ? platform : "unknown";
};

/** Explicit lifecycle for one rendered platform message. */
export class BotMessageRoot<Host, Message, Snapshot, Interaction> {
  readonly uuid = randomUUID();
  readonly #fiber: Fiber.Fiber<never, never>;
  readonly #host: Host;
  readonly #target: MessageTarget<Message, Snapshot>;
  readonly #ref: unknown;
  readonly #interaction: (interaction: Interaction) => Promise<void>;
  readonly #client: MessageRootClient | undefined;
  readonly #telemetry: TelemetryHandle;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #closed = false;

  constructor(options: BotMessageRootOptions<Host, Message, Snapshot, Interaction>) {
    this.#fiber = options.fiber;
    this.#host = options.host;
    this.#target = options.target;
    this.#ref = options.ref;
    this.#interaction = options.interaction;
    this.#client = options.client;
    this.#telemetry = options.telemetry ?? Telemetry.current();

    if (options.renderOptions.unmountAfter) {
      this.#timer = setTimeout(() => void this.unmount(), options.renderOptions.unmountAfter);
    }
  }

  get host(): Host {
    return this.#host;
  }

  get target(): MessageTarget<Message, Snapshot> {
    return this.#target;
  }

  get interactionRef(): unknown {
    return this.#ref;
  }

  get closed(): boolean {
    return this.#closed;
  }

  interactionListener(interaction: Interaction): Promise<void> {
    if (this.#closed) return Promise.resolve();
    return this.#telemetry.span(
      TelemetrySpans.messageInteraction,
      {
        kind: "consumer",
        attributes: {
          "messaging.system": platformOf(this.#host),
          "arona.message.uuid": this.uuid,
        },
      },
      () => this.#interaction(interaction),
    );
  }

  /** Explicitly releases the renderer, platform cache, target, timer and client registration. */
  close(): Effect.Effect<void> {
    const platform = platformOf(this.#host);
    return Effect.suspend(() => {
      if (this.#closed) return Effect.void;
      this.#closed = true;
      if (this.#timer) {
        clearTimeout(this.#timer);
        this.#timer = null;
      }
      this.#target.close();
      this.#client?.removeInteractionListener(this.uuid);
      return Fiber.interrupt(this.#fiber).pipe(
        Effect.tap(() =>
          Effect.sync(() =>
            this.#telemetry.counter(TelemetryMetrics.messagesClosed, 1, {
              "messaging.system": platform,
            }),
          ),
        ),
        Effect.withSpan(TelemetrySpans.messageClose, {
          attributes: {
            "messaging.system": platform,
            "arona.message.uuid": this.uuid,
          },
        }),
      );
    });
  }

  /** Promise convenience for callers outside Effect. */
  async unmount(): Promise<void> {
    await this.#telemetry.run(this.close());
  }
}
