import { Telemetry, TelemetryMetrics, TelemetrySpans, type TelemetryHandle } from "@arona/core";
import { App, type AppOptions } from "@slack/bolt";
import type { SlackMessageRoot } from "./root";
import type { SlackActionPayload, SlackMessageEvent } from "./types";

export interface AronaSlackClientOptions extends AppOptions {
  /**
   * Telemetry runtime to install for this client. Defaults to an
   * environment-configured runtime (`OTEL_EXPORTER_OTLP_ENDPOINT`).
   */
  readonly telemetry?: TelemetryHandle | undefined;
}

/**
 * A Slack app that owns Arona rendered message roots and routes Block Kit
 * actions to the button handlers of the matching message.
 *
 * It also attaches itself to every incoming message as `message.arona`, so
 * `renderMessage(message, ...)` can find the Web API client.
 */
export class AronaSlackClient extends App {
  readonly #interactionRoots = new Map<string, SlackMessageRoot>();
  readonly #telemetry: TelemetryHandle;

  constructor({ telemetry, ...options }: AronaSlackClientOptions = {}) {
    super(options);
    this.#telemetry = telemetry ? Telemetry.install(telemetry) : Telemetry.installFromEnv();
    this.use(async (args) => {
      const message = (args as { message?: SlackMessageEvent }).message;
      if (message) {
        (
          message as SlackMessageEvent & {
            arona?: { readonly client: AronaSlackClient };
          }
        ).arona = { client: this };
      }

      const event =
        (args as { event?: { type?: string }; body?: { type?: string } }).event?.type ??
        (args as { body?: { type?: string } }).body?.type ??
        "unknown";
      await this.#telemetry.span(
        TelemetrySpans.slackEvent,
        {
          kind: "consumer",
          attributes: {
            "messaging.system": "slack",
            "arona.slack.event": event,
          },
        },
        () => args.next(),
      );
    });
    super.action(/.*/, this.globalActionListener);
    super.error(async (error) => {
      this.#telemetry.counter(TelemetryMetrics.operationErrors, 1, {
        "messaging.system": "slack",
        "arona.operation": "bolt",
        "error.type": error.name,
      });
      console.error(error);
    });
  }

  /** The telemetry runtime used by this client and its rendered messages. */
  get telemetry(): TelemetryHandle {
    return this.#telemetry;
  }

  start(...args: Parameters<App["start"]>): ReturnType<App["start"]> {
    return this.#telemetry.span(
      TelemetrySpans.clientStart,
      { attributes: { "messaging.system": "slack" } },
      () => super.start(...args),
    ) as ReturnType<App["start"]>;
  }

  async destroy(): Promise<void> {
    await Promise.all([...this.#interactionRoots.values()].map((root) => root.unmount()));
    this.#interactionRoots.clear();
    await super.stop();
  }

  globalActionListener: (payload: SlackActionPayload) => Promise<void> = (payload) =>
    this.#telemetry.span(
      TelemetrySpans.interaction,
      {
        kind: "consumer",
        attributes: {
          "messaging.system": "slack",
          "arona.interaction.type": "block_action",
        },
      },
      async () => {
        const actionId = (payload.action as { action_id?: string } | undefined)?.action_id;
        let handled = false;

        if (typeof actionId === "string") {
          for (const root of this.#interactionRoots.values()) {
            if (!root.host.handles(actionId)) continue;
            await root.interactionListener(payload);
            handled = true;
            break;
          }
        }

        if (!handled) {
          // Slack expects every block action to be acknowledged, even when no
          // rendered message owns it.
          await payload.ack();
        }

        this.#telemetry.counter(TelemetryMetrics.interactions, 1, {
          "messaging.system": "slack",
          "arona.interaction.type": "block_action",
          "arona.handled": handled,
        });
      },
    );

  addRoot(root: SlackMessageRoot): this {
    this.#interactionRoots.set(root.uuid, root);
    return this;
  }

  removeInteractionListener(uuid: string): this {
    this.#interactionRoots.delete(uuid);
    return this;
  }

  /** Alias kept for symmetry with the original Slack client API. */
  removeRoot(uuid: string): this {
    return this.removeInteractionListener(uuid);
  }
}
