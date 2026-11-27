import { Component, Renderer, UiSchema } from "@effect/ui";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { BotHost } from "./host";

const CounterMessage = UiSchema.TaggedEnum({ Clicked: {} });

const Counter = Component.define({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: ($, message) =>
    CounterMessage.match(message, {
      Clicked: () => $.evolve({ count: (count) => count + 1 }),
    }),
  view: (h, model) =>
    h.el("button").on("click", CounterMessage.Clicked()).children(`count ${model.count}`),
});

describe("message state snapshots", () => {
  it("resumes a tree from a snapshot in a fresh mount", async () => {
    const result = await Effect.runPromise(
      Effect.gen(function* () {
        const state = yield* Effect.scoped(
          Effect.gen(function* () {
            const host = new BotHost({ name: "test" });
            const root = yield* Renderer.mount(Counter, {}, host.container).pipe(
              Effect.provide(Renderer.layer(host)),
            );

            expect(root.model()).toEqual({ count: 0 });
            root.send(CounterMessage.Clicked());
            expect(root.model()).toEqual({ count: 1 });

            return yield* root.snapshot;
          }),
        );

        return yield* Effect.scoped(
          Effect.gen(function* () {
            const host = new BotHost({ name: "test" });
            const root = yield* Renderer.mount(Counter, {}, host.container, {
              state,
            }).pipe(Effect.provide(Renderer.layer(host)));

            const resumed = root.model();
            root.send(CounterMessage.Clicked());

            return { resumed, updated: root.model() };
          }),
        );
      }),
    );

    expect(result.resumed).toEqual({ count: 1 });
    expect(result.updated).toEqual({ count: 2 });
  });
});
