# @arona/slack

Slack Block Kit integration for Arona. It uses the same Effect UI renderer,
message lifecycle, and host abstractions as `@arona/discord`; only the Slack
host, target, and Block Kit vocabulary are platform-specific.

## Quick start

```ts
import { AronaSlackClient, renderMessage } from "@arona/slack";
import { App } from "./app";

const client = new AronaSlackClient({
  token: process.env.SLACK_BOT_TOKEN!,
  appToken: process.env.SLACK_APP_TOKEN!,
  socketMode: true,
});

client.message(/hi/i, async ({ message }) => {
  await renderMessage(message, App, {});
});

await client.start();
```

`AronaSlackClient` attaches itself to every incoming message as
`message.arona`, so the renderer can find Slack's Web API client. The first
render is posted as a thread reply by default; pass `replyInThread: false` to
post in the channel instead.

## Components

Slack has no root block, so group more than one block in an explicit `Blocks`
container:

```ts
import { Actions, Blocks, Button, Divider, Section, Text, component } from "@arona/slack";
import { UiSchema } from "@effect/ui";
import { Schema } from "effect";

const Message = UiSchema.TaggedEnum({ Clicked: {} });

export const App = component({
  name: "Counter",
  model: Schema.Struct({ count: Schema.Number }),
  message: Message,
}).make({
  init: () => ({ count: 0 }),
  update: { Clicked: ($) => $.evolve({ count: (n) => n + 1 }) },
  view: (h, model) =>
    Blocks(h, {
      children: [
        Section(h, { children: [Text(h, `Count: ${model.count}`)] }),
        Divider(h),
        Actions(h, {
          children: [
            Button(h, {
              style: "primary",
              onClick: Message.Clicked(),
              children: ["+1"],
            }),
          ],
        }),
      ],
    }),
});
```

Composition is explicit:

- `Text` and `Markdown` may only appear inside a `Section`.
- `Button` may only appear inside `Actions`, or as a `Section` accessory.
- `Section` must contain a `Text` or `Markdown` child.
- `Actions` must contain at least one `Button`.

Invalid trees fail when the host serializes the message, instead of silently
producing a malformed Block Kit payload.

## Lifecycle

`renderMessage` is the simple API. Use `mountMessage` when you need the root
handle, and close it when the message should stop listening:

```ts
const { message, root } = await mountMessage(ref, App, {}, { client });

await root.close(); // idempotent
```

Inside Effect, `mountMessageScoped` ties the message root to the surrounding
Scope. Closing the root interrupts the renderer fiber and releases the
message's Layer, query cache, and button listeners.

## Testing

`@arona/slack/testing` provides `FakeSlackClient`, `messageRef`, `blocksOf`,
and `fakeAction`:

```ts
import { mountMessage } from "@arona/slack";
import { FakeSlackClient, fakeAction, messageRef } from "@arona/slack/testing";

const client = new FakeSlackClient();
const { root } = await mountMessage(messageRef(), App, {}, { client });
const { payload, acks } = fakeAction("button-action-id");
await root.interactionListener(payload);
```
