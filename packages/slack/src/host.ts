import {
  BotHost as BaseBotHost,
  type BotNode,
  Telemetry,
  TelemetryMetrics,
  TelemetrySpans,
  type TelemetryHandle,
} from "@arona/core";
import { Renderer } from "@effect/ui";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { actionIdOf, serializeBlocks } from "./serialize";
import { type SlackMessageTarget, MessageTarget } from "./target";
import type { SlackActionPayload, SlackBlock } from "./types";
import { Host } from "./vocabulary";

const interactiveTags = new Set(["button"]);

export interface SlackHostOptions {
  /** Prefix for generated ids. Tests can pass a deterministic value. */
  readonly prefix?: string;
  readonly onCommit?: (blocks: ReadonlyArray<SlackBlock>) => void;
  readonly telemetry?: TelemetryHandle | undefined;
}

/**
 * The Slack host: the shared bot node tree plus Block Kit serialization and
 * interactive action routing.
 */
export class SlackHost extends BaseBotHost {
  readonly #onCommit: ((blocks: ReadonlyArray<SlackBlock>) => void) | undefined;
  readonly #telemetry: TelemetryHandle;
  #nodesByActionId = new Map<string, BotNode>();
  #waiters: Array<() => void> = [];

  commits = 0;

  constructor(options: SlackHostOptions = {}) {
    super({
      name: "slack",
      ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
      interactiveTags,
    });
    this.#onCommit = options.onCommit;
    this.#telemetry = options.telemetry ?? Telemetry.current();
  }

  commit(): void {
    this.commits++;
    this.#telemetry.counter(TelemetryMetrics.renders, 1, {
      "messaging.system": "slack",
    });

    this.#nodesByActionId.clear();
    for (const node of this.container.descendants()) {
      if (node.tag === "button" && Object.keys(node.handlers).length > 0) {
        this.#nodesByActionId.set(actionIdOf(node), node);
      }
    }

    this.#onCommit?.(serializeBlocks(this.container));

    const waiters = this.#waiters;
    this.#waiters = [];
    for (const resolve of waiters) resolve();
  }

  /** Whether a rendered button owns this Slack `action_id`. */
  handles(actionId: string): boolean {
    return this.#nodesByActionId.has(actionId);
  }

  /** Waits until a commit after `after` has run, or the timeout elapses. */
  waitForCommit(after: number, timeoutMs = 100): Promise<void> {
    if (this.commits > after) return Promise.resolve();
    return new Promise((resolve) => {
      let timer: ReturnType<typeof setTimeout>;
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      timer = setTimeout(() => {
        this.#waiters = this.#waiters.filter((waiter) => waiter !== done);
        resolve();
      }, timeoutMs);
      this.#waiters.push(done);
    });
  }

  /**
   * Routes a Slack block action to the rendered button handler.
   *
   * Slack requires an acknowledgement within three seconds, so the action is
   * acked before the handler runs and the message is updated.
   */
  async dispatchInteraction(payload: SlackActionPayload): Promise<boolean> {
    return this.#telemetry.span(
      TelemetrySpans.messageInteraction,
      {
        kind: "consumer",
        attributes: {
          "messaging.system": "slack",
          "arona.interaction.type": "block_action",
        },
      },
      () => this.#dispatchInteraction(payload),
    );
  }

  async #dispatchInteraction(payload: SlackActionPayload): Promise<boolean> {
    const actionId = (payload.action as { action_id?: string } | undefined)?.action_id;
    if (typeof actionId !== "string") return false;

    const node = this.#nodesByActionId.get(actionId);
    if (!node) return false;

    const handler = node.handlers["click"];
    if (!handler || !node.dispatch) return false;

    await payload.ack();
    const before = this.commits;
    const handled = node.dispatch("click", handler, payload);
    if (!handled) return false;

    await this.waitForCommit(before);
    return true;
  }
}

export interface SlackHostLayerOptions {
  readonly prefix?: string;
  readonly telemetry?: TelemetryHandle | undefined;
}

/** Creates a host wired to a message target. */
export const create = (
  target: SlackMessageTarget,
  options: SlackHostLayerOptions = {},
): SlackHost =>
  new SlackHost({
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
    onCommit: (blocks) => target.queue(blocks),
  });

export const layer = (
  options: SlackHostLayerOptions = {},
): Layer.Layer<Host | Renderer.Renderer, never, MessageTarget> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const target = yield* MessageTarget;
      const host = create(target, options);
      const context = yield* Effect.context();
      return Context.add(Context.add(context, Host, host), Renderer.Renderer, { host });
    }),
  );

export const layerFor = (host: SlackHost): Layer.Layer<Host | Renderer.Renderer> =>
  Layer.merge(Layer.succeed(Host, host), Renderer.layer(host));
