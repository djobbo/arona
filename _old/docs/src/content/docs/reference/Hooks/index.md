---
title: Custom Hooks
description: Custom hooks for your bot
---

Reaccord provides a set of custom hooks that allow you to hook into the lifecycle of your bot.

```jsx
import { Embed } from "reaccord"

function MyBot() {
  useReceivedReply((message) => {
    console.log("Received message:", message.content)
  })

  useReactionAdded((reaction) => {
    console.log("Reaction added:", reaction.emoji)
  })

  return <>Hello World</>
}
```
