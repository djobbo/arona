import { Button, Span } from "reaccord"
import { useState } from "react"

type CounterProps = {
  start?: number
}

export const Counter = ({ start = 0 }: CounterProps) => {
  const [count, setCount] = useState(start)

  return (
    <>
      <Span bold>{count}</Span>
      <Button onClick={() => setCount(count + 1)}>+</Button>
    </>
  )
}
