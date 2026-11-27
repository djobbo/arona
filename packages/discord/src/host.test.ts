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

  it("assigns deterministic session interaction ids in document order", () => {
    const render = (version: number) => {
      const host = new DiscordHost({ prefix: "random-prefix" });
      host.setSession({ id: "session", version });
      const first = host.createElement("button");
      const second = host.createElement("button");
      host.setAttr(first, "label", "First");
      host.setAttr(second, "label", "Second");
      host.insertBefore(host.container, first, undefined);
      host.insertBefore(host.container, second, undefined);
      host.commit();
      return { host, first, second };
    };

    const one = render(1);
    expect(one.first.customId).toBe("ar1.session.1.a0");
    expect(one.second.customId).toBe("ar1.session.1.a1");

    const again = render(1);
    expect(again.first.customId).toBe(one.first.customId);
    expect(again.second.customId).toBe(one.second.customId);

    const later = render(2);
    expect(later.first.customId).toBe("ar1.session.2.a0");
    expect(later.second.customId).toBe("ar1.session.2.a1");
  });

  it("keeps an author's custom id as the interaction id key", () => {
    const host = new DiscordHost({ prefix: "random-prefix" });
    host.setSession({ id: "session", version: 0 });
    const button = host.createElement("button");
    host.setAttr(button, "label", "Explicit");
    host.setAttr(button, "customId", "my.button");
    host.insertBefore(host.container, button, undefined);
    host.commit();
    expect(button.customId).toBe("ar1.session.0.my.button");
  });

  it("recomputes ordinals after a node leaves the tree", () => {
    const host = new DiscordHost({ prefix: "random-prefix" });
    host.setSession({ id: "session", version: 1 });
    const first = host.createElement("button");
    const second = host.createElement("button");
    host.setAttr(first, "label", "First");
    host.setAttr(second, "label", "Second");
    host.insertBefore(host.container, first, undefined);
    host.insertBefore(host.container, second, undefined);
    host.commit();
    expect(second.customId).toBe("ar1.session.1.a1");

    first.detach();
    host.commit();
    expect(second.customId).toBe("ar1.session.1.a0");
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
