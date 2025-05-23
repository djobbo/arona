---
title: Field
description: Field Component for Embeds
---

The `Embed.Field` component allows you to add a field to an embed.
It must be used as a child of the Embed component.
You can have multiple fields in an embed (up to 25 fields).
Here's how you can use it:

```jsx
import { Embed } from "reaccord"

function MyEmbed() {
  return (
    <Embed>
      <Embed.Field title="Field 1">
        lorem ipsum dolor sit amet consectetur adipiscing elit
      </Embed.Field>
      <Embed.Field title="Field 2" inline>
        lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua
      </Embed.Field>
      <Embed.Field title="Field 3">
        lorem ipsum dolor sit amet
      </Embed.Field>
      {/* ... Add more components */}
    </Embed>
  )
}
```

Props:
- `title`: The field name to display.
- `children`: The field value to display.
- `inline`: Whether to display the field inline or not. Defaults to `false`.
