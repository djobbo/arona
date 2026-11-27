import { mountMessage } from "@arona/discord";
import { FakeChannel, fakeButtonInteraction, findButtonCustomId } from "@arona/discord/testing";
import { describe, expect, it } from "vite-plus/test";
import { App } from "./app";

const textOf = (payload: unknown) => {
  const texts: string[] = [];
  const walk = (value: unknown) => {
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    if (record.type === 10 && typeof record.content === "string") {
      texts.push(record.content);
    }
    for (const child of Object.values(record)) {
      if (Array.isArray(child)) child.forEach(walk);
      else if (typeof child === "object") walk(child);
    }
  };
  walk(payload);
  return texts;
};

describe("simple example", () => {
  it("counts, opens a modal, and stores the submitted value", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), App, {
      message: { content: "hello" },
    });

    expect(textOf(channel.sent[0]).join("\n")).toContain("Original Message: `hello`");

    const firstCustomId = findButtonCustomId(channel.sent[0]);
    await root.interactionListener(fakeButtonInteraction(firstCustomId) as never);
    expect(textOf(channel.edits[0]).join("\n")).toContain("Count `1`");

    // The modal is not shown for a non-BaseInteraction fake; click the second
    // rendered button by custom id instead.
    const buttons = [...root.host.container.descendants()].filter((node) => node.tag === "button");
    const openModalButton = buttons.at(-1);
    expect(openModalButton?.customId).toBeDefined();
    await root.interactionListener(fakeButtonInteraction(openModalButton!.customId!) as never);

    const modal = [...root.host.container.descendants()].find((node) => node.tag === "modal");
    expect(modal).toBeDefined();
    if (!modal?.customId) return;

    await root.interactionListener({
      customId: modal.customId,
      replied: false,
      deferred: false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isAnySelectMenu: () => false,
      isModalSubmit: () => true,
      isRepliable: () => true,
      deferUpdate: async () => {},
      fields: {
        getTextInputValue: () => "submitted",
        getCheckbox: () => true,
        getRadioGroup: () => "pro",
      },
    } as never);

    expect(textOf(channel.edits.at(-1)).join("\n")).toContain("Submitted: `submitted`");
    await root.unmount();
  });
});
