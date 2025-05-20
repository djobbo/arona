import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react"
import { useCharacters } from "./useCharacters"
import type { Character, PageMetadata } from "../types"

interface ICharacterSearchContext {
  search: string
  setSearch: (search: string) => void
  page: number
  setPage: (page: number) => void
  pageMetadata: PageMetadata | null
  characters: Character[]
  isLoading: boolean
  character: Character | null
  selectCharacter: (id: string) => void
}

const characterSearchContext = createContext<ICharacterSearchContext>({
  search: "",
  setSearch: () => {},
  page: 1,
  setPage: () => {},
  characters: [],
  pageMetadata: null,
  isLoading: false,
  character: null,
  selectCharacter: () => {},
})

export const useCharacterSearch = () => {
  const context = useContext(characterSearchContext)
  if (!context) {
    throw new Error(
      "useCharacterSearch must be used within a CharacterSearchProvider",
    )
  }

  return context
}

type CharacterSearchProviderProps = {
  children: ReactNode
  defaultSearch?: string
}

export const CharacterSearchProvider = ({
  children,
  defaultSearch,
}: CharacterSearchProviderProps) => {
  const [search, setSearch] = useState(defaultSearch ?? "")
  const [page, setPage] = useState(1)
  const [character, setCharacter] = useState<Character | null>(null)
  console.log("CharacterSearchProvider", { search, page })
  const { characters, pageMetadata, isLoading } = useCharacters(search, page)

  const selectCharacter = (id: string) => {
    setCharacter(characters?.find((char) => char.id.toString() === id) ?? null)
  }

  useEffect(() => {
    setCharacter(characters?.[0] ?? null)
  }, [characters])

  useEffect(() => {
    setPage(1)
  }, [search])

  return (
    <characterSearchContext.Provider
      value={{
        search,
        setSearch,
        page,
        setPage,
        pageMetadata,
        characters,
        isLoading,
        character,
        selectCharacter,
      }}
    >
      {children}
    </characterSearchContext.Provider>
  )
}
