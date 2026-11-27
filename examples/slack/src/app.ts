import { Actions, Blocks, Button, Divider, Section, Text, component } from "@arona/slack";
import { UiSchema } from "@effect/ui";
import { Schema } from "effect";

const AppMessage = UiSchema.TaggedEnum({
  ClickedIncrement: {},
  ClickedReset: {},
});

/** An interactive Block Kit message with a shared counter. */
export const App = component({
  name: "SlackCounter",
  model: Schema.Struct({ count: Schema.Number }),
  message: AppMessage,
}).make({
  init: () => ({ count: 0 }),
  update: {
    ClickedIncrement: ($) => $.evolve({ count: (count) => count + 1 }),
    ClickedReset: ($) => $.set({ count: 0 }),
  },
  view: (h, model) =>
    Blocks(h, {
      children: [
        Section(h, {
          children: [Text(h, `:wave: Count: *${model.count}*`)],
        }),
        Divider(h),
        Actions(h, {
          children: [
            Button(h, {
              style: "primary",
              onClick: AppMessage.ClickedIncrement(),
              children: ["+1"],
            }),
            Button(h, {
              style: "danger",
              onClick: AppMessage.ClickedReset(),
              disabled: model.count === 0,
              children: ["Reset"],
            }),
          ],
        }),
      ],
    }),
});
