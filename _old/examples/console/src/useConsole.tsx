import { Chalk, Chalkboard } from "@reaccord/chalk"
import { EMPTY_STRING } from "reaccord/lib/helpers/constants"
import { useState } from "react"

const Console = ({ lines }: { lines: string[] }) => {
  return (
    <Chalkboard>
      {lines.map((line, i) =>
        line ? (
          <Chalk key={i} br>
            <Chalk fg={Chalk.FG.Red}>{"> "}</Chalk>
            {line}
          </Chalk>
        ) : (
          <Chalk key={i} br>
            {EMPTY_STRING}
          </Chalk>
        ),
      )}
      <Chalk fg={Chalk.FG.Blue}>{">"}</Chalk>
    </Chalkboard>
  )
}

export const useConsole = (lineCount: number = 8) => {
  const [lines, setLines] = useState<string[]>(
    Array.from({ length: lineCount }, () => ""),
  )

  const addLine = (line: string) => {
    setLines((lines) => {
      let newLines = [...lines, line]

      if (newLines.length > lineCount) {
        newLines.shift()
      }

      return newLines
    })
  }

  const clearLines = () => {
    setLines(Array.from({ length: lineCount }, () => ""))
  }

  return { lines, setLines, clearLines, addLine, Console }
}
