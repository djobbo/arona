import type { APISeparatorComponent } from "discord.js"
import type { AronaProps } from "./types"
import type { FC } from "react"

export const Separator = "arona:separator" as unknown as FC<
  AronaProps<APISeparatorComponent>
>
