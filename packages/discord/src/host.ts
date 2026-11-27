import {
  BotHost as BaseBotHost,
  Telemetry,
  TelemetryMetrics,
  TelemetrySpans,
  type TelemetryHandle,
} from "@arona/core";
import { Renderer } from "@effect/ui";
import type { Interaction } from "discord.js";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { type DiscordNode } from "./node";
import { buildModal, collectModals, modalValues, serializeMessage } from "./serialize";
import type { MessageSnapshot, ModalRequest } from "./types";
import { DiscordMessageTarget, MessageTarget } from "./target";
import { Host } from "./vocabulary";

const interactiveTags = new Set([
  "button",
  "select",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
  "modal",
  "textInput",
  "checkbox",
  "checkboxGroup",
  "radioGroup",
  "fileUpload",
]);

export interface DiscordHostOptions {
  /** Prefix for generated ids. Tests can pass a deterministic value. */
  readonly prefix?: string;
  readonly onCommit?: (snapshot: MessageSnapshot) => void;
  readonly onShowModal?: (request: ModalRequest) => void;
  readonly telemetry?: TelemetryHandle | undefined;
}

/**
 * The Discord host: the shared bot node tree plus Components V2 serialization
 * and interaction routing.
 */
export class DiscordHost extends BaseBotHost {
  readonly #onCommit: ((snapshot: MessageSnapshot) => void) | undefined;
  readonly #onShowModal: ((request: ModalRequest) => void) | undefined;
  readonly #telemetry: TelemetryHandle;
  #nodesByCustomId = new Map<string, DiscordNode>();
  #waiters: Array<() => void> = [];

  interaction: Interaction | null = null;
  modalShownFor: Interaction | null = null;
  commits = 0;

  constructor(options: DiscordHostOptions = {}) {
    super({
      name: "discord",
      ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
      interactiveTags,
    });
    this.#onCommit = options.onCommit;
    this.#onShowModal = options.onShowModal;
    this.#telemetry = options.telemetry ?? Telemetry.current();
  }

  commit(): void {
    this.commits++;
    this.#telemetry.counter(TelemetryMetrics.renders, 1, {
      "messaging.system": "discord",
    });

    this.#nodesByCustomId.clear();
    for (const node of this.container.descendants()) {
      if (node.customId && (node.tag === "modal" || Object.keys(node.handlers).length > 0)) {
        this.#nodesByCustomId.set(node.customId, node);
      }
    }

    for (const node of collectModals(this.container)) {
      if (node.modalShown) continue;
      node.modalShown = true;
      this.modalShownFor = this.interaction;
      this.#onShowModal?.({ node, builder: buildModal(node) });
    }

    this.#onCommit?.(serializeMessage(this.container));

    const waiters = this.#waiters;
    this.#waiters = [];
    for (const resolve of waiters) resolve();
  }

  /** Waits until a commit after `after` has run, or the timeout elapses. */
  waitForCommit(after: number, timeoutMs = 100): Promise<void> {
    if (this.commits > after) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        resolve();
      };
      const timer = setTimeout(() => {
        this.#waiters = this.#waiters.filter((waiter) => waiter !== done);
        resolve();
      }, timeoutMs);
      this.#waiters.push(done);
    });
  }

  async dispatchInteraction(interaction: Interaction): Promise<boolean> {
    const type = interaction.isButton()
      ? "button"
      : interaction.isAnySelectMenu()
        ? "select"
        : interaction.isModalSubmit()
          ? "modal"
          : "unknown";

    return this.#telemetry.span(
      TelemetrySpans.messageInteraction,
      {
        kind: "consumer",
        attributes: {
          "messaging.system": "discord",
          "arona.interaction.type": type,
        },
      },
      () => this.#dispatchInteraction(interaction),
    );
  }

  async #dispatchInteraction(interaction: Interaction): Promise<boolean> {
    if (!("customId" in interaction)) return false;

    const event = interaction.isButton()
      ? "click"
      : interaction.isAnySelectMenu()
        ? "change"
        : interaction.isModalSubmit()
          ? "submit"
          : undefined;
    if (!event) return false;

    const node = this.#nodesByCustomId.get(interaction.customId);
    if (!node) return false;

    const handler = node.handlers[event];
    if (!handler || !node.dispatch) {
      if (interaction.isModalSubmit() && interaction.isRepliable()) {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.deferUpdate().catch((error) => {
            console.error("Failed to acknowledge interaction", error);
          });
        }
      }
      return false;
    }

    const payload =
      interaction.isModalSubmit() && node.tag === "modal"
        ? { interaction, ...modalValues(node, interaction) }
        : interaction;

    this.interaction = interaction;
    const before = this.commits;
    const handled = node.dispatch(event, handler, payload);
    if (!handled) {
      this.interaction = null;
      return false;
    }

    await this.waitForCommit(before);
    this.interaction = null;

    if (this.modalShownFor === interaction) {
      this.modalShownFor = null;
      return true;
    }

    if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
      await interaction.deferUpdate().catch((error) => {
        console.error("Failed to acknowledge interaction", error);
      });
    }

    return true;
  }
}

export interface DiscordHostLayerOptions {
  readonly prefix?: string;
  readonly telemetry?: TelemetryHandle | undefined;
}

/** Creates a host wired to a message target. */
export const create = (
  target: DiscordMessageTarget,
  options: DiscordHostLayerOptions = {},
): DiscordHost => {
  let host: DiscordHost;
  host = new DiscordHost({
    ...(options.prefix === undefined ? {} : { prefix: options.prefix }),
    ...(options.telemetry === undefined ? {} : { telemetry: options.telemetry }),
    onCommit: (snapshot) => target.queue(snapshot),
    onShowModal: ({ builder }) => {
      const interaction = host.interaction;
      if (
        !interaction ||
        !interaction.isRepliable() ||
        interaction.isModalSubmit() ||
        typeof interaction.showModal !== "function"
      ) {
        return;
      }
      interaction.showModal(builder).catch((error: unknown) => {
        console.error("Failed to show modal", error);
      });
    },
  });
  return host;
};

export const layer = (
  options: DiscordHostLayerOptions = {},
): Layer.Layer<Host | Renderer.Renderer, never, MessageTarget> =>
  Layer.effectContext(
    Effect.gen(function* () {
      const target = yield* MessageTarget;
      const host = create(target, options);
      const context = yield* Effect.context();
      return Context.add(Context.add(context, Host, host), Renderer.Renderer, { host });
    }),
  );

export const layerFor = (host: DiscordHost): Layer.Layer<Host | Renderer.Renderer> =>
  Layer.merge(Layer.succeed(Host, host), Renderer.layer(host));
