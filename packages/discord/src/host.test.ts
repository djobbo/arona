import { Renderer } from "@effect/ui";
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vite-plus/test";
import { DiscordHost, layer as hostLayer } from "./host";
import { DiscordMessageTarget, MessageTarget } from "./target";
import { FakeChannel } from "./testing";
import { Host } from "./vocabulary";

const fakeInteraction = (customId: string) => {
  const interaction = {
    customId,
    replied: false,
    deferred: false,
    deferredUpdates: 0,
    isButton: () => true,
    isStringSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    isRepliable: () => true,
    deferUpdate: async () => {
      interaction.deferred = true;
      interaction.deferredUpdates++;
    },
    showModal: vi.fn(async () => undefined),
  };
  return interaction;
};

describe("DiscordHost", () => {
  it("emits a snapshot on every commit", () => {
    const onCommit = vi.fn();
    const host = new DiscordHost({ prefix: "test", onCommit });
    const text = host.createElement("text");
    host.setText(host.createText("hello"), "hello");
    // `createText` is not parented until inserted, as the renderer does.
    const textNode = host.createText("hello");
    host.insertBefore(text, textNode, undefined);
    host.insertBefore(host.container, text, undefined);
    host.commit();

    expect(onCommit).toHaveBeenCalledOnce();
    const snapshot = onCommit.mock.calls[0]?.[0] as {
      components: Array<{ type: number; content: string }>;
    };
    expect(snapshot.components[0]).toMatchObject({ type: 10, content: "hello" });
  });

  it("shows a new modal once and remembers the interaction", () => {
    const onShowModal = vi.fn();
    const host = new DiscordHost({ prefix: "test", onShowModal });
    const modal = host.createElement("modal");
    host.setAttr(modal, "title", "Edit");
    host.insertBefore(host.container, modal, undefined);

    const interaction = fakeInteraction("modal");
    host.interaction = interaction as never;
    host.commit();
    host.commit();

    expect(onShowModal).toHaveBeenCalledOnce();
    expect(host.modalShownFor).toBe(interaction);
  });

  it("routes an interaction to the rendered handler and acknowledges it", async () => {
    const host = new DiscordHost({ prefix: "test" });
    const button = host.createElement("button");
    const message = { _tag: "Clicked" };
    const dispatch = vi.fn(() => true);
    host.setEvents(button, { click: message as never }, dispatch as never, {});
    host.insertBefore(host.container, button, undefined);
    host.commit();

    const interaction = fakeInteraction(button.customId as string);
    const handled = await host.dispatchInteraction(interaction as never);

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(interaction.deferredUpdates).toBe(1);
  });

  it("ignores interactions with no rendered handler", async () => {
    const host = new DiscordHost({ prefix: "test" });
    host.commit();
    const interaction = fakeInteraction("missing");
    expect(await host.dispatchInteraction(interaction as never)).toBe(false);
    expect(interaction.deferredUpdates).toBe(0);
  });
});

describe("Discord layers", () => {
  it("provides Host and Renderer from MessageTarget", async () => {
    const target = new DiscordMessageTarget(new FakeChannel().asRef());
    const layers = hostLayer().pipe(Layer.provideMerge(MessageTarget.fromTarget(target)));

    const services = await Effect.runPromise(
      Effect.gen(function* () {
        const host = yield* Host;
        const renderer = yield* Renderer.Renderer;
        return { host, renderer };
      }).pipe(Effect.provide(layers)),
    );

    expect(services.host).toBeInstanceOf(DiscordHost);
    expect(services.renderer.host).toBe(services.host);
  });
});
