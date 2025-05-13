import { useQuery } from "@tanstack/react-query"
import type { Character, PageInfo } from "../types"

type APIResponse = {
  info: PageInfo
  results: Character[]
}

type Response = {
  characters: Character[]
  pageInfo: PageInfo
}

type Options = {
  onSuccess: (res: Response) => void
  onError: () => void
}

export const useCharacters = (name: string, page: number) => {
  const { data, ...query } = useQuery<Response>({
    queryKey: ["character", { name, page }],
    queryFn: async () => {
      const response = await fetch(
        `https://rickandmortyapi.com/api/character/?name=${name}&page=${page}`,
      )
      const data = (await response.json()) as APIResponse

      return {
        characters: data.results,
        pageInfo: data.info,
      }
    },
  })

  return { data, ...query }
}
