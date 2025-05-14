import type { APIContainerComponent, ColorResolvable } from "discord.js"
import type { AronaProps } from "./types"
import type { FC, PropsWithChildren } from "react"

interface ContainerProps
  extends AronaProps<
    Omit<APIContainerComponent, "accent_color" | "components">
  > {
  accentColor?: ColorResolvable
}

export const Container = "arona:container" as unknown as FC<
  PropsWithChildren<ContainerProps>
>
