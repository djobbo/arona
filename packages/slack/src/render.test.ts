import { UiSchema } from "@effect/ui";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { Actions, Blocks, Button, Divider, Markdown, Section, Text } from "./components";
import { mountMessage, mountMessageScoped } from "./render";
import type { SlackMessageRoot } from "./root";
import { FakeSlackClient, fakeAction, messageRef } from "./testing";
import * as Slack from "./vocabulary";

const CounterMessage = UiSchema.TaggedEnum({ ClickedIncrement: {} });

const Counter = Slack.component({
  name: "SlackCounter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: {
    ClickedIncrement: ($) => $.evolve({ count: (n) => n + 1 }),
  },
  view: (h, model) =>
    Blocks(h, {
      children: [
        Section(h, {
          children: [Text(h, `Count: ${model.count}`)],
        }),
        Actions(h, {
          children: [
            Button(h, {
              onClick: CounterMessage.ClickedIncrement(),
              children: ["+"],
            }),
          ],
        }),
        Divider(h),
      ],
    }),
});

const waitFor = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for a Slack update");
};

describe("mountMessage", () => {
  it("posts Block Kit blocks and updates the message on interaction", async () => {
    const client = new FakeSlackClient();
    const { message, root } = await mountMessage(messageRef(), Counter, {}, { client });

    expect(message.channel).toBe("C123");
    expect(message.ts).toBe("ts-1");
    expect(client.sent).toHaveLength(1);
    expect(client.sent[0]?.thread_ts).toBe("111.222");
    expect(client.sent[0]?.blocks[0]).toMatchObject({
      type: "section",
      text: { type: "plain_text", text: "Count: 0" },
    });
    expect(client.sent[0]?.blocks[2]).toEqual({
      type: "divider",
      block_id: expect.any(String),
    });

    const actions = client.sent[0]?.blocks[1] as {
      elements: Array<{ action_id: string }>;
    };
    const actionId = actions.elements[0]?.action_id;
    expect(actionId).toBeDefined();

    const { payload, acks } = fakeAction(actionId as string);
    await root.interactionListener(payload);
    await waitFor(() => client.updated.length === 1);

    expect(acks).toHaveLength(1);
    expect(client.updated[0]?.blocks[0]).toMatchObject({
      type: "section",
      text: { type: "plain_text", text: "Count: 1" },
    });

    await root.unmount();
  });

  it("renders markdown sections", async () => {
    const App = Slack.component({
      name: "MarkdownApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Blocks(h, {
          children: [Section(h, { children: [Markdown(h, "*hello*")] })],
        }),
    });

    const client = new FakeSlackClient();
    await mountMessage(messageRef(), App, {}, { client });

    expect(client.sent[0]?.blocks[0]).toEqual({
      type: "section",
      block_id: expect.any(String),
      text: { type: "mrkdwn", text: "*hello*" },
    });
  });

  it("can post outside a thread", async () => {
    const client = new FakeSlackClient();
    await mountMessage(messageRef(), Counter, {}, { client, replyInThread: false });

    expect(client.sent[0]?.thread_ts).toBeUndefined();
  });

  it("closes a scoped message when its Scope ends", async () => {
    const client = new FakeSlackClient();
    let handle: SlackMessageRoot | undefined;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { root } = yield* mountMessageScoped(messageRef(), Counter, {}, { client });
          handle = root;
          expect(root.closed).toBe(false);
        }),
      ),
    );

    expect(handle?.closed).toBe(true);
  });

  it("closes explicitly and idempotently", async () => {
    const client = new FakeSlackClient();
    const { root } = await mountMessage(messageRef(), Counter, {}, { client });

    expect(root.closed).toBe(false);
    await Effect.runPromise(root.close());
    await Effect.runPromise(root.close());
    expect(root.closed).toBe(true);
  });

  it("requires a Slack client", async () => {
    await expect(mountMessage(messageRef(), Counter, {})).rejects.toThrow(/AronaSlackClient/);
  });
});
