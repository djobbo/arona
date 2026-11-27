import { UiSchema } from "@effect/ui";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { ActionRow, Button, Container, Section, Text, Thumbnail } from "./components";
import { mountMessage, mountMessageScoped } from "./render";
import { FakeChannel, fakeButtonInteraction, findButtonCustomId, findComponent } from "./testing";
import * as Discord from "./vocabulary";

const CounterMessage = UiSchema.TaggedEnum({ ClickedIncrement: {} });

const Counter = Discord.component({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: { ClickedIncrement: ($) => $.evolve({ count: (n) => n + 1 }) },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Step: ${model.count}`),
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Primary",
              onClick: CounterMessage.ClickedIncrement(),
              children: ["+"],
            }),
          ],
        }),
      ],
    }),
});

describe("mountMessage", () => {
  it("sends a Components V2 message and re-renders on interaction", async () => {
    const channel = new FakeChannel();
    const { message, root } = await mountMessage(channel.asRef(), Counter, {});

    expect(message.id).toBe("message");
    expect(channel.sent).toHaveLength(1);
    const payload = channel.sent[0] as { components: unknown[]; flags: number };
    expect(payload.components.length).toBeGreaterThan(0);

    const text = findComponent(payload, (component) => component.type === 10);
    expect(text?.content).toBe("# Step: 0");

    const customId = findButtonCustomId(payload);
    const interaction = fakeButtonInteraction(customId);
    await root.interactionListener(interaction as never);

    expect(interaction.deferred).toBe(true);
    expect(channel.edits).toHaveLength(1);
    const edited = findComponent(channel.edits[0], (component) => component.type === 10);
    expect(edited?.content).toBe("# Step: 1");

    await root.unmount();
  });

  it("closes a scoped message when its Scope ends", async () => {
    const channel = new FakeChannel();
    let handle: import("./root").DiscordMessageRoot | undefined;

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* () {
          const { root } = yield* mountMessageScoped(channel.asRef(), Counter, {});
          handle = root;
          expect(root.closed).toBe(false);
        }),
      ),
    );

    expect(handle?.closed).toBe(true);
  });

  it("closes explicitly and idempotently", async () => {
    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), Counter, {});

    expect(root.closed).toBe(false);
    await Effect.runPromise(root.close());
    await Effect.runPromise(root.close());
    expect(root.closed).toBe(true);
  });

  it("renders sections with an accessory button", async () => {
    const App = Discord.component({
      name: "SectionApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Section(h, {
              accessory: Button(h, { children: ["Open"] }),
              children: [Text(h, "Section body")],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), App, {});
    const section = findComponent(channel.sent[0], (component) => component.type === 9);
    expect(section).toBeDefined();
    expect(section?.accessory).toMatchObject({ type: 2, label: "Open" });
  });

  it("skips empty messages by sending an invisible content fallback", async () => {
    const Empty = Discord.component({
      name: "Empty",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => h.container,
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), Empty, {});
    const payload = channel.sent[0] as { content?: string; components: unknown[] };
    expect(payload.components).toEqual([]);
    expect(payload.content).toBe("​");
  });

  it("adds attachments to the payload", async () => {
    const App = Discord.component({
      name: "MediaApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Section(h, {
              accessory: Thumbnail(h, {
                file: Buffer.from("image"),
                name: "thumb.png",
              }),
              children: [Text(h, "With thumbnail")],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), App, {});
    const payload = channel.sent[0] as { files: unknown[] };
    expect(payload.files).toHaveLength(1);
  });
});

describe("Effect services", () => {
  it("provides a layer to commands run by the component", async () => {
    const { Command, UiSchema } = await import("@effect/ui");
    const { Context, Effect, Layer } = await import("effect");

    class Greeting extends Context.Service<Greeting, { readonly value: string }>()("Greeting") {}

    const LoadedMessage = UiSchema.TaggedEnum({
      Loaded: { value: Schema.String },
    });

    class LoadGreeting extends Command.Service<LoadGreeting>()("test/LoadGreeting", {
      args: {},
      success: LoadedMessage,
      error: Schema.Never,
    }) {
      static readonly layer = this.toLayer(
        Effect.gen(function* () {
          const greeting = yield* Greeting;
          return () => Effect.succeed(LoadedMessage.Loaded({ value: greeting.value }));
        }),
      );
    }

    const App = Discord.component({
      name: "ServiceApp",
      model: Schema.Struct({ value: Schema.String }),
      message: LoadedMessage,
    }).make({
      init: ($) => $.set({ value: "loading" }).run(LoadGreeting.make({})),
      update: { Loaded: ($, message) => $.set({ value: message.value }) },
      view: (h, model) => Container(h, { children: [Text(h, model.value)] }),
    });

    const channel = new FakeChannel();
    await mountMessage(
      channel.asRef(),
      App,
      {},
      {
        layer: LoadGreeting.layer.pipe(
          Layer.provide(Layer.succeed(Greeting, { value: "hello" })),
        ) as never,
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 10));
    const text = findComponent(channel.edits[0] ?? channel.sent[0], (c) => c.type === 10);
    expect(text?.content).toBe("hello");
  });
});
