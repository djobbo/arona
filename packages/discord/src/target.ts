import { BotMessageTarget } from "@arona/core";
import * as Context from "effect/Context";
import * as Layer from "effect/Layer";
import {
  BaseInteraction,
  type InteractionCallbackResponse,
  Message,
  MessageFlags,
} from "discord.js";
import { EMPTY_STRING } from "./constants";
import type { InteractionRef, MessageRenderOptions, MessageSnapshot } from "./types";

const MESSAGE_FLAGS = MessageFlags.IsComponentsV2;

type ReplyPayload = {
  components: ReadonlyArray<unknown>;
  files: ReadonlyArray<unknown>;
  content?: string;
  flags?: number;
};

/**
 * Sends the first payload and edits the message after that.
 *
 * The shared target keeps only the newest snapshot, so edits that arrive
 * while Discord is still handling one are coalesced.
 */
export class DiscordMessageTarget extends BotMessageTarget<Message, MessageSnapshot> {
  readonly #ref: InteractionRef;
  readonly #options: MessageRenderOptions;

  constructor(ref: InteractionRef, options: MessageRenderOptions = {}) {
    super("discord", options.telemetry);
    this.#ref = ref;
    this.#options = options;
  }

  #payload(snapshot: MessageSnapshot, includeFlags: boolean): ReplyPayload {
    const isEmpty = snapshot.components.length === 0;
    const ephemeral = this.#options.ephemeral === true;

    return {
      components: snapshot.components,
      files: snapshot.files,
      ...(isEmpty ? { content: EMPTY_STRING } : {}),
      ...(includeFlags
        ? {
            flags: MESSAGE_FLAGS | (ephemeral ? MessageFlags.Ephemeral : 0),
          }
        : {}),
    };
  }

  protected fingerprint(snapshot: MessageSnapshot): string {
    return JSON.stringify({
      components: snapshot.components,
      files: snapshot.files.map((file) => file.name),
    });
  }

  protected async send(snapshot: MessageSnapshot): Promise<Message> {
    const current = this.currentMessage;
    if (!current) {
      const payload = this.#payload(snapshot, true);

      if (this.#ref instanceof Message) {
        return this.#ref.reply(payload as never);
      }

      if (this.#ref instanceof BaseInteraction) {
        const response = (await this.#ref.reply({
          ...payload,
          withResponse: true,
        } as never)) as InteractionCallbackResponse;
        const message = response.resource?.message;
        if (!message) throw new Error("Discord did not return a message");
        return message;
      }

      return this.#ref.send(payload as never);
    }

    if (this.#options.ephemeral && this.#ref instanceof BaseInteraction) {
      await this.#ref.editReply(this.#payload(snapshot, false) as never);
      return current;
    }

    await current.edit(this.#payload(snapshot, false) as never);
    return current;
  }
}

/** The message target service for one rendered message. */
export class MessageTarget extends Context.Service<MessageTarget, DiscordMessageTarget>()(
  "@arona/discord/MessageTarget",
) {
  static readonly layer = (
    ref: InteractionRef,
    options: MessageRenderOptions = {},
  ): Layer.Layer<MessageTarget> => MessageTarget.fromTarget(new DiscordMessageTarget(ref, options));

  static readonly fromTarget = (target: DiscordMessageTarget): Layer.Layer<MessageTarget> =>
    Layer.succeed(MessageTarget, target);
}
