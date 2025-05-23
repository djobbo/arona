---
title: Description
description: Description Component for Embeds
---

The `Embed.Description` component allows you to define the description for an embed.
It must be used as a child of the Embed component. Here's how you can use it:

```jsx
import { Embed } from "reaccord"

function MyEmbed() {
  return (
    <Embed>
      <Embed.Description>lorem ipsum dolor sit amet</Embed.Description>
      {/* ... Add more components */}
    </Embed>
  )
}
```

Props:
- `children`: The description text to display.
