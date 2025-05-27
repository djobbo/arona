import { useQuery } from "@tanstack/react-query"
import type { Character, PageMetadata } from "../types"

type APIResponse = {
  info: PageMetadata
  results: Character[]
}

export const useCharacters = (search: string, page: number) => {
  const { data, ...query } = useQuery({
    queryKey: ["character", search, page],
    queryFn: async () => {
      const response = await fetch(
        `https://rickandmortyapi.com/api/character/?name=${search}&page=${page}`,
      )
      const data = (await response.json()) as APIResponse

      return {
        characters: data.results,
        pageMetadata: data.info,
      }
    },
  })

  if (!data) {
    return {
      characters: [] as Character[],
      pageMetadata: null,
      isLoading: query.isLoading,
    }
  }

  return {
    characters: data.characters ?? [],
    pageMetadata: data.pageMetadata,
    isLoading: query.isLoading,
  }
}
