import type { ReactNode } from "react"

const ESCAPE = "\u001b"
const BR = "\u000a"
const RESET = `${ESCAPE}[0m`

enum Format {
  Normal = 0,
  Bold = 1,
  Underline = 4,
}

enum FG {
  Gray = 30,
  Red = 31,
  Green = 32,
  Yellow = 33,
  Blue = 34,
  Pink = 35,
  Cyan = 36,
  White = 37,
}

enum BG {
  FireflyDarkBlue = 40,
  Orange = 41,
  MarbleBlue = 42,
  GreyishTurquoise = 43,
  Gray = 44,
  Indigo = 45,
  LightGray = 46,
  White = 47,
}

type ChalkProps = {
  format?: Format
  fg?: FG
  bg?: BG
  children?: ReactNode
  br?: boolean
}

const ChalkComponent = ({ children, format, fg, bg, br }: ChalkProps) => {
  const formatCode = format ?? Format.Normal

  if (fg && bg) {
    return (
      <>
        {ESCAPE}[{formatCode};{fg};{bg}m{children}
        {RESET}
        {br && BR}
      </>
    )
  }

  if (fg) {
    return (
      <>
        {ESCAPE}[{formatCode};{fg}m{children}
        {RESET}
        {br && BR}
      </>
    )
  }

  if (bg) {
    return (
      <>
        {ESCAPE}[{formatCode};{bg}m{children}
        {RESET}
        {br && BR}
      </>
    )
  }

  if (format) {
    return (
      <>
        {ESCAPE}[{formatCode}m{children}
        {RESET}
        {br && BR}
      </>
    )
  }

  return (
    <>
      {children}
      {br && BR}
    </>
  )
}

export const Chalk = Object.assign(ChalkComponent, {
  Format,
  FG,
  BG,
})
