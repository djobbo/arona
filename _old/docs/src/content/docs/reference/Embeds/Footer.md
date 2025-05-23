---
title: Footer
description: Footer Component for Embeds
---

The `Embed.Footer` component allows you to add a footer to an embed.
It must be used as a child of the Embed component. Here's how you can use it:

```jsx
import { Embed } from "reaccord"

function MyEmbed() {
  return (
    <Embed>
      <Embed.Footer iconUrl="https://example.com/icon.png">
        My awesome footer
      </Embed.Footer>
      {/* ... Add more components */}
    </Embed>
  )
}
```

Props:
- `children`: The footer text to display.
- `iconUrl`: URL of the icon to display next to the footer text.
