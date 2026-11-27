import { BotMessageTarget } from "@arona/core";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import type {
  MessageRenderOptions,
  SlackBlock,
  SlackMessage,
  SlackMessageRef,
  SlackWebClient,
} from "./types";

/**
 * Posts the first Block Kit payload and updates the message after that.
 *
 * The shared target keeps only the newest snapshot, so edits that arrive while
 * Slack is still handling one are coalesced.
 */
export class SlackMessageTarget extends BotMessageTarget<SlackMessage, ReadonlyArray<SlackBlock>> {
  readonly #client: SlackWebClient;
  readonly #ref: SlackMessageRef;
  readonly #options: MessageRenderOptions;

  constructor(client: SlackWebClient, ref: SlackMessageRef, options: MessageRenderOptions = {}) {
    super("slack", options.telemetry);
    this.#client = client;
    this.#ref = ref;
    this.#options = options;
  }

  protected fingerprint(snapshot: ReadonlyArray<SlackBlock>): string {
    return JSON.stringify(snapshot);
  }

  protected async send(snapshot: ReadonlyArray<SlackBlock>): Promise<SlackMessage> {
    const current = this.currentMessage;
    const blocks = [...snapshot];
    const fallback = blocks.length === 0 ? " " : undefined;

    if (!current) {
      const threadTs =
        this.#options.replyInThread === false ? undefined : (this.#ref.thread_ts ?? this.#ref.ts);

      const response = await this.#client.chat.postMessage({
        channel: this.#ref.channel,
        ...(threadTs === undefined ? {} : { thread_ts: threadTs }),
        blocks,
        ...(fallback === undefined ? {} : { text: fallback }),
      });

      if (response.ok === false || !response.ts) {
        throw new Error(`Slack chat.postMessage failed: ${response.error ?? "missing ts"}`);
      }

      return {
        channel: response.channel ?? this.#ref.channel,
        ts: response.ts,
        raw: response,
      };
    }

    const response = await this.#client.chat.update({
      channel: current.channel,
      ts: current.ts,
      blocks,
      ...(fallback === undefined ? {} : { text: fallback }),
    });

    if (response.ok === false) {
      throw new Error(`Slack chat.update failed: ${response.error ?? "unknown"}`);
    }

    return current;
  }
}

/** The message target service for one rendered Slack message. */
export class MessageTarget extends Context.Service<MessageTarget, SlackMessageTarget>()(
  "@arona/slack/MessageTarget",
) {
  static readonly layer = (
    client: SlackWebClient,
    ref: SlackMessageRef,
    options: MessageRenderOptions = {},
  ): Layer.Layer<MessageTarget> =>
    MessageTarget.fromTarget(new SlackMessageTarget(client, ref, options));

  static readonly fromTarget = (target: SlackMessageTarget): Layer.Layer<MessageTarget> =>
    Layer.succeed(MessageTarget, target);
}
