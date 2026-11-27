import { Renderer } from "@effect/ui";
import { Effect, Layer } from "effect";
import { describe, expect, it, vi } from "vite-plus/test";
import { SlackHost, layer as hostLayer } from "./host";
import { SlackMessageTarget, MessageTarget } from "./target";
import { FakeSlackClient, fakeAction, messageRef } from "./testing";
import { Host } from "./vocabulary";

describe("SlackHost", () => {
  it("emits Block Kit blocks on every commit", () => {
    const onCommit = vi.fn();
    const host = new SlackHost({ prefix: "test", onCommit });
    const section = host.createElement("section");
    const text = host.createElement("text");
    const content = host.createText("hello");
    host.setText(content, "hello");
    host.insertBefore(text, content, undefined);
    host.insertBefore(section, text, undefined);
    host.insertBefore(host.container, section, undefined);
    host.commit();

    expect(onCommit).toHaveBeenCalledOnce();
    expect(onCommit.mock.calls[0]?.[0]).toEqual([
      {
        type: "section",
        block_id: "test-1",
        text: { type: "plain_text", text: "hello", emoji: true },
      },
    ]);
  });

  it("routes an action to the rendered handler and acknowledges it", async () => {
    const host = new SlackHost({ prefix: "test" });
    const button = host.createElement("button");
    const text = host.createText("+");
    host.insertBefore(button, text, undefined);
    const message = { _tag: "Clicked" };
    const dispatch = vi.fn(() => true);
    host.setEvents(button, { click: message as never }, dispatch as never, {});
    host.insertBefore(host.container, button, undefined);
    host.commit();

    expect(host.handles(button.customId as string)).toBe(true);

    const { payload, acks } = fakeAction(button.customId as string);
    const handled = await host.dispatchInteraction(payload);

    expect(handled).toBe(true);
    expect(dispatch).toHaveBeenCalledOnce();
    expect(acks).toHaveLength(1);
  });

  it("ignores an action with no rendered handler", async () => {
    const host = new SlackHost({ prefix: "test" });
    host.commit();
    const { payload, acks } = fakeAction("missing");

    expect(host.handles("missing")).toBe(false);
    expect(await host.dispatchInteraction(payload)).toBe(false);
    expect(acks).toHaveLength(0);
  });

  it("does not index a button without a handler", () => {
    const host = new SlackHost({ prefix: "test" });
    const button = host.createElement("button");
    host.insertBefore(host.container, button, undefined);
    host.commit();

    expect(host.handles(button.customId as string)).toBe(false);
  });
});

describe("Slack layers", () => {
  it("provides Host and Renderer from MessageTarget", async () => {
    const target = new SlackMessageTarget(new FakeSlackClient(), messageRef());
    const layers = hostLayer().pipe(Layer.provideMerge(Layer.succeed(MessageTarget, target)));

    const services = await Effect.runPromise(
      Effect.gen(function* () {
        const host = yield* Host;
        const renderer = yield* Renderer.Renderer;
        return { host, renderer };
      }).pipe(Effect.provide(layers)),
    );

    expect(services.host).toBeInstanceOf(SlackHost);
    expect(services.renderer.host).toBe(services.host);
  });
});
