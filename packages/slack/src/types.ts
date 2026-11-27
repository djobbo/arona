import type { BlockAction, SlackActionMiddlewareArgs, SlackEventMiddlewareArgs } from "@slack/bolt";
import type { TelemetryHandle } from "@arona/core";
import type { KnownBlock } from "@slack/types";
import type { ChatPostMessageResponse, ChatUpdateResponse } from "@slack/web-api";
import type { AronaSlackClient } from "./client";

/** A Slack message event as received from Bolt. */
export type SlackMessageEvent = SlackEventMiddlewareArgs<"message">["message"];

/** The part of a Slack message the renderer replies to. */
export interface SlackMessageRef {
  readonly channel: string;
  readonly ts: string;
  readonly thread_ts?: string;
  /** Set by {@link AronaSlackClient} on every incoming message. */
  readonly arona?: { readonly client: AronaSlackClient };
}

/** The payload a Slack button handler receives. */
export type SlackActionPayload = SlackActionMiddlewareArgs<BlockAction>;

/** A Slack Block Kit block. */
export type SlackBlock = KnownBlock;

/** The subset of a Slack message the message lifecycle needs. */
export interface SlackMessage {
  readonly channel: string;
  readonly ts: string;
  readonly raw: ChatPostMessageResponse;
}

/** The minimal Web API surface the Slack target uses. */
export interface SlackWebClient {
  readonly chat: {
    postMessage(request: SlackPostMessageRequest): Promise<ChatPostMessageResponse>;
    update(request: SlackUpdateRequest): Promise<ChatUpdateResponse>;
  };
}

export interface SlackPostMessageRequest {
  readonly channel: string;
  readonly thread_ts?: string;
  readonly blocks: KnownBlock[];
  readonly text?: string;
}

export interface SlackUpdateRequest {
  readonly channel: string;
  readonly ts: string;
  readonly blocks: KnownBlock[];
  readonly text?: string;
}

export interface MessageRenderOptions {
  /** Post the rendered message as a thread reply. Defaults to true. */
  readonly replyInThread?: boolean;
  readonly unmountAfter?: number;
  /** Telemetry runtime for this message. Defaults to the process-wide runtime. */
  readonly telemetry?: TelemetryHandle | undefined;
}
