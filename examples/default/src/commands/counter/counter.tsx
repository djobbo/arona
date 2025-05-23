import { Button, Canvas, Container, Text } from "@arona/discord"
import { useState } from "react"
import { createRequire } from 'module'
import { readFileSync } from 'fs'

const require = createRequire(import.meta.url)
const resolve = require.resolve
const roboto = readFileSync(resolve("@fontsource/roboto/files/roboto-latin-400-normal.woff"))
const slackey = readFileSync(resolve("@fontsource/slackey/files/slackey-latin-400-normal.woff"))

export const Counter = () => {
  const [count, setCount] = useState(0)

  return (
    <>
    <Container>
      <Text># Step: `{count}`</Text>
      <Button
        onClick={() => {
          setCount((prev) => prev + 1)
        }}
        >
        +
      </Button>
      <Canvas width={256} height={96} name="counter.png" fonts={[{
        name: "Roboto",
        data: roboto,
        style: "normal",
        weight: 400,
      }]}>
        <div style={{
          fontFamily: "Slackey",
          fontSize: 32,
          color: "white",
          backgroundColor: "black",
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}>Hello</div>
      </Canvas>
    </Container>
      {/* <Text>
```ansi<br/>
Welcome to [2;33mRebane[0m's [2;45m[2;37mDiscord[0m[2;45m[0m [2;31mC[0m[2;32mo[0m[2;33ml[0m[2;34mo[0m[2;35mr[0m[2;36me[0m[2;37md[0m Text Generator!
```
      </Text> */}
      </>
  )
}
