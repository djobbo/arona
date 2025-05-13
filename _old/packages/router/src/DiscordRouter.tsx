import { MemoryRouter } from "react-router"
import type { MemoryRouterProps } from "react-router"

export interface DiscordRouterProps extends MemoryRouterProps {}

export const DiscordRouter = (props: DiscordRouterProps) => {
  return <MemoryRouter {...props} />
}
