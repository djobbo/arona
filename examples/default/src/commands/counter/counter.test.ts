import { mountMessage } from "@arona/discord";
import {
  FakeChannel,
  fakeButtonInteraction,
  findButtonCustomId,
  findComponent,
} from "@arona/discord/testing";
import { describe, expect, it } from "vite-plus/test";
import { Counter } from "./counter";

describe("counter example", () => {
  it("increments and attaches the canvas image", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), Counter, {});

    expect(findComponent(channel.sent[0], (c) => c.type === 10)?.content).toBe("# Step: `0`");
    const payload = channel.sent[0] as { files: Array<{ name: string }> };
    expect(payload.files.map((file) => file.name)).toContain("counter.png");

    await root.interactionListener(
      fakeButtonInteraction(findButtonCustomId(channel.sent[0])) as never,
    );

    expect(findComponent(channel.edits[0], (c) => c.type === 10)?.content).toBe("# Step: `1`");
    await root.unmount();
  });
});
