---
title: Title
description: Title Component for Embeds
---

The `Embed.Title` component allows you to define the title for an embed.
It must be used as a child of the Embed component. Here's how you can use it:

```jsx
import { Embed } from "reaccord"

function MyEmbed() {
  return (
    <Embed>
      <Embed.Title>Title</Embed.Title>
      {/* ... Add more components */}
    </Embed>
  )
}
```

Props:
- `children`: The title text to display.
