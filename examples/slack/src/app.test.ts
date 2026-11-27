import { mountMessage } from "@arona/slack";
import { FakeSlackClient, fakeAction, messageRef } from "@arona/slack/testing";
import { describe, expect, it } from "vite-plus/test";
import { App } from "./app";

const waitFor = async (check: () => boolean) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  throw new Error("Timed out waiting for a Slack update");
};

const sectionText = (block: unknown) => (block as { text?: { text?: string } }).text?.text;

interface ActionElement {
  readonly action_id: string;
  readonly disabled?: boolean;
}

const actionElements = (block: unknown): ReadonlyArray<ActionElement> =>
  (block as { elements?: ReadonlyArray<ActionElement> }).elements ?? [];

const actionIds = (block: unknown) => actionElements(block).map((element) => element.action_id);

describe("slack example", () => {
  it("posts a counter and updates it on button clicks", async () => {
    const client = new FakeSlackClient();
    const { root } = await mountMessage(messageRef(), App, {}, { client });

    expect(client.sent).toHaveLength(1);
    expect(sectionText(client.sent[0]?.blocks[0])).toContain("Count: *0*");
    expect(actionElements(client.sent[0]?.blocks[2])[1]?.disabled).toBe(true);

    const [increment, reset] = actionIds(client.sent[0]?.blocks[2]);
    expect(increment).toBeDefined();
    expect(reset).toBeDefined();

    const clicked = fakeAction(increment as string);
    await root.interactionListener(clicked.payload);
    await waitFor(() => client.updated.length === 1);

    expect(clicked.acks).toHaveLength(1);
    expect(sectionText(client.updated[0]?.blocks[0])).toContain("Count: *1*");
    expect(actionElements(client.updated[0]?.blocks[2])[1]?.disabled).toBeUndefined();

    await root.unmount();
  });
});
