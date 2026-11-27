import { describe, expect, it, vi } from "vite-plus/test";
import { AronaSlackClient } from "./client";
import type { SlackMessageRoot } from "./root";
import { fakeAction } from "./testing";

const fakeRoot = (actionId: string) => {
  const listener = vi.fn(async () => undefined);
  const root = {
    uuid: "root-1",
    host: { handles: (id: string) => id === actionId },
    interactionListener: listener,
    unmount: vi.fn(async () => undefined),
  } as unknown as SlackMessageRoot;
  return { root, listener };
};

describe("AronaSlackClient", () => {
  it("routes an action to the owning root", async () => {
    const client = new AronaSlackClient({
      token: "xoxb-test",
      signingSecret: "secret",
    });
    const { root, listener } = fakeRoot("increment");
    client.addRoot(root);

    const { payload, acks } = fakeAction("increment");
    await client.globalActionListener(payload);

    expect(listener).toHaveBeenCalledOnce();
    expect(acks).toHaveLength(0);
  });

  it("acknowledges an action that no root owns", async () => {
    const client = new AronaSlackClient({
      token: "xoxb-test",
      signingSecret: "secret",
    });
    client.addRoot(fakeRoot("increment").root);

    const { payload, acks } = fakeAction("missing");
    await client.globalActionListener(payload);

    expect(acks).toHaveLength(1);
  });

  it("removes a root by id", () => {
    const client = new AronaSlackClient({
      token: "xoxb-test",
      signingSecret: "secret",
    });
    const { root, listener } = fakeRoot("increment");
    client.addRoot(root);
    client.removeInteractionListener(root.uuid);

    expect(listener).not.toHaveBeenCalled();
  });
});
