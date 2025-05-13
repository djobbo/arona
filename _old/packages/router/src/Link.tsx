import { Button } from "reaccord"
import { useNavigate } from "react-router"
import type { ReaccordElements } from "reaccord"
import type { To } from "react-router"

export type LinkProps = {
  replace?: boolean
  state?: any
  to: To
} & ReaccordElements["actionRow"]["button"]

export const Link = ({ replace = false, state, to, ...rest }: LinkProps) => {
  const navigate = useNavigate()
  return <Button {...rest} onClick={() => navigate(to, { replace, state })} />
}
