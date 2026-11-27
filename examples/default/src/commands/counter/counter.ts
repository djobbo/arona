import { UiSchema } from "@effect/ui";
import { ActionRow, Button, Canvas, Container, Gallery, Text } from "@arona/discord";
import * as Discord from "@arona/discord";
import { Schema } from "effect";

const CounterMessage = UiSchema.TaggedEnum({
  ClickedIncrement: {},
});

/** Draws the current count as an SVG that the host renders to PNG. */
const counterSvg = (count: number) => `
<svg xmlns="http://www.w3.org/2000/svg" width="256" height="96">
	<rect width="256" height="96" rx="12" fill="#111827" />
	<text x="128" y="58" text-anchor="middle" fill="#f9fafb"
		font-family="sans-serif" font-size="32" font-weight="700">${count}</text>
</svg>`;

export const Counter = Discord.component({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: {
    ClickedIncrement: ($) => $.evolve({ count: (count) => count + 1 }),
  },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Step: \`${model.count}\``),
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Primary",
              onClick: CounterMessage.ClickedIncrement(),
              children: ["+"],
            }),
          ],
        }),
        Gallery(h, {
          children: [
            Canvas(h, {
              svg: counterSvg(model.count),
              width: 256,
              height: 96,
              name: "counter.png",
            }),
          ],
        }),
      ],
    }),
});
