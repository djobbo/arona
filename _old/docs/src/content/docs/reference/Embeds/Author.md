---
title: Author
description: Author Component for Embeds
---

The `Embed.Author` component allows you to add a author to an embed.
It must be used as a child of the Embed component. Here's how you can use it:

```jsx
import { Embed } from "reaccord"

function MyEmbed() {
  return (
    <Embed>
      <Embed.Author 
        name="John Doe" 
        url="https://djobbo.com" 
        iconUrl="https://example.com/icon.png"
      />
      {/* ... Add more components */}
    </Embed>
  )
}
```

Props:
- `name`: The author name to display.
- `url`: URL to link the author to.
- `iconUrl`: URL of the icon to display next to the author name.