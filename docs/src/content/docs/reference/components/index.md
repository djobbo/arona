---
title: Message Components
description: Discord message components
---

The Message Components are a set of components that allow you to create rich Discord messages.
Such as Buttons, Select Menus, Links, etc...

```jsx
import { Embed } from "reaccord"

function MyBot() {
  const [selected, setSelected] = useState('cool')

  return (
    <>
      <Button
        style={ButtonStyle.Secondary}
        onClick={() => setCurrentPage(1)}
        disabled={loading || page <= 1}
      >
        {"<<"}
      </Button>
      <SelectMenu onChange={([val]) => setSelected(val)}>
        <SelectMenu.Option
          value="cool"
          description="This is a cool option"
          selected={selected === "cool"}
        >
          Cool
        </SelectMenu.Option>
        <SelectMenu.Option
          value="awesome"
          description="This is an awesome option"
          selected={selected === "awesome"}
        >
          Awesome
        </SelectMenu.Option>
      </SelectMenu>
      {/* ... Add more components */}
    </>
  )
}
```
