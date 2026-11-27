import { UiSchema } from "@effect/ui";
import { ActionRow, Button, Container, Text } from "@arona/discord";
import * as Discord from "@arona/discord";
import { createSlashCommand } from "@arona/discord";
import { Schema } from "effect";

const CounterMessage = UiSchema.TaggedEnum({ Clicked: {} });

export const Counter = Discord.component({
  name: "Counter",
  props: Schema.Struct({}),
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: {
    Clicked: ($) => $.evolve({ count: (count) => count + 1 }),
  },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Count: ${model.count}`),
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Primary",
              onClick: CounterMessage.Clicked(),
              children: ["Add one"],
            }),
          ],
        }),
      ],
    }),
});

export const counter = createSlashCommand("counter", {
  command: (builder) => builder.setDescription("A resumable counter"),
  component: Counter,
});
