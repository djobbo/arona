import type { AronaProps } from "./types"
import type { FC, PropsWithChildren } from "react"
import type { LinkButtonComponentData } from "discord.js"

export const LinkButton = "arona:link-button" as unknown as FC<
  PropsWithChildren<Partial<Omit<AronaProps<LinkButtonComponentData>, "style">>>
>
