# @arona/discord

A Discord host and component vocabulary for [`@effect/ui`](https://github.com/Effect-TS/ui).

```ts
import * as Discord from "@arona/discord";
import { ActionRow, Button, Container, Text } from "@arona/discord";
import { Schema } from "effect";
import { UiSchema } from "@effect/ui";

const Message = UiSchema.TaggedEnum({ Clicked: {} });

export const Counter = Discord.component({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: Message,
}).make({
  init: () => ({ count: 0 }),
  update: { Clicked: ($) => $.evolve({ count: (n) => n + 1 }) },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `Count: ${model.count}`),
        ActionRow(h, {
          children: [Button(h, { onClick: Message.Clicked(), children: ["+"] })],
        }),
      ],
    }),
});
```

The package exports:

- the Discord element vocabulary and `Discord.component`
- Components V2 view helpers (`Container`, `Text`, `Section`, `Button`, string/user/role/mentionable/channel selects, `Modal`, labels, checkboxes, radio groups, file uploads, ...)
- `DiscordHost` and `MessageTarget` Layers
- `renderMessage`, `mountMessage`, and scoped `mountMessageScoped`
- explicit `root.close()` lifecycle
- `createSlashCommand`, typed option builders, and command reload helpers
- modal fields: `Label`, `TextInput`, `Checkbox`, `CheckboxGroup` / `CheckboxOption`, `RadioGroup` / `RadioOption`, `FileUpload`
- `@arona/discord/testing` with `FakeChannel`, payload finders, and interaction fakes
