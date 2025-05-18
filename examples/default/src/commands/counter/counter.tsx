import { Button, Text } from "@arona/core"
import { useState } from "react"

export const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <>
      <Text>Count: `{count}`</Text>
      <Button
        onClick={() => {
          setCount((prev) => prev + 1)
        }}
      >
        Increment
      </Button>
    </>
  )
}
