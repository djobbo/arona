import { mountMessage } from "@arona/discord";
import {
  fakeButtonInteraction,
  FakeChannel,
  findButtonCustomId,
  findComponent,
} from "@arona/discord/testing";
import { expect, it } from "vite-plus/test";
import { Counter } from "./counter.ts";

it("renders and updates the serverless counter", async () => {
  const channel = new FakeChannel();
  const { root } = await mountMessage(channel.asRef(), Counter, {});

  const customId = findButtonCustomId(channel.sent[0]);
  await root.interactionListener(fakeButtonInteraction(customId) as never);

  const text = findComponent(channel.edits[0], (component) => component.type === 10);
  expect(text?.content).toBe("# Count: 1");
  await root.unmount();
});
