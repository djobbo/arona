import { useLocation } from "react-router"
import qs from "query-string"
import type { ParseOptions, ParsedQuery } from "query-string"

export const useQuery = <T extends ParsedQuery = ParsedQuery>(
  options: ParseOptions = {},
) => {
  const { search } = useLocation()

  return qs.parse(search, options) as T
}
