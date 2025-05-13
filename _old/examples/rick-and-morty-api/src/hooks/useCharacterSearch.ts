import { useCharacters } from "./useCharacters"
import { useEffect, useState } from "react"
import type { Character } from "../types"

export const useCharacterSearch = (defaultSearch?: string) => {
  const [search, setSearch] = useState(defaultSearch ?? "")
  const [page, setPage] = useState(1)
  const [character, setCharacter] = useState<Character | undefined>(undefined)
  const { data: { characters, pageInfo } = {}, isLoading } = useCharacters(
    search,
    page,
  )

  const selectCharacter = (id: string) => {
    setCharacter(characters?.find((char) => char.id.toString() === id))
  }

  useEffect(() => {
    if (characters && characters.length > 0) {
      setCharacter(characters[0])
      return
    }

    setCharacter(undefined)
  }, [characters])

  return {
    search,
    setSearch,
    page,
    setPage,
    characters,
    pageInfo,
    isLoading,
    character,
    selectCharacter,
  }
}
