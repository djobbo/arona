import type { KnownBlock } from "@slack/types";
import type { ChatPostMessageResponse, ChatUpdateResponse } from "@slack/web-api";
import type {
  SlackActionPayload,
  SlackMessageRef,
  SlackPostMessageRequest,
  SlackUpdateRequest,
  SlackWebClient,
} from "../types";

/** A Web API client that records every post and update. */
export class FakeSlackClient implements SlackWebClient {
  readonly sent: SlackPostMessageRequest[] = [];
  readonly updated: SlackUpdateRequest[] = [];
  #counter = 0;

  readonly chat = {
    postMessage: async (request: SlackPostMessageRequest): Promise<ChatPostMessageResponse> => {
      this.sent.push(request);
      this.#counter++;
      return {
        ok: true,
        channel: request.channel,
        ts: `ts-${this.#counter}`,
      };
    },
    update: async (request: SlackUpdateRequest): Promise<ChatUpdateResponse> => {
      this.updated.push(request);
      return { ok: true, channel: request.channel, ts: request.ts };
    },
  };
}

export const messageRef = (overrides: Partial<SlackMessageRef> = {}): SlackMessageRef => ({
  channel: "C123",
  ts: "111.222",
  ...overrides,
});

export const blocksOf = (
  request: SlackPostMessageRequest | SlackUpdateRequest | undefined,
): ReadonlyArray<KnownBlock> => request?.blocks ?? [];

/** A fake block action with a recorded ack. */
export const fakeAction = (actionId: string) => {
  const acks: unknown[] = [];
  const payload = {
    action: {
      type: "button",
      action_id: actionId,
      block_id: "block",
    },
    body: {
      type: "block_actions",
      actions: [],
      user: { id: "U123", username: "tester" },
      team: null,
    },
    ack: async () => {
      acks.push(true);
    },
    respond: async () => undefined,
    say: async () => undefined,
  } as unknown as SlackActionPayload;

  return { payload, acks };
};
