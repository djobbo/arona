import { CharacterEmbed } from "./components/CharacterEmbed"
import { CharacterSelect } from "./components/CharacterSelect"
import { Navigation } from "./components/Navigation"
import { SearchCharacterRow } from "./components/SearchCharacterRow"
import { useCharacterSearch } from "./hooks/useCharacterSearch"

type AppProps = {
  search?: string
}

export const App = ({ search: defaultSearch }: AppProps) => {
  const {
    search,
    setSearch,
    page,
    setPage,
    characters,
    pageInfo,
    isLoading,
    character,
    selectCharacter,
  } = useCharacterSearch(defaultSearch)

  return (
    <>
      <CharacterEmbed character={character} isLoading={isLoading} />
      {characters && (
        <CharacterSelect
          characters={characters}
          character={character}
          onSelectCharacter={selectCharacter}
          isLoading={isLoading}
        />
      )}
      <SearchCharacterRow
        search={search}
        setSearch={(val) => {
          setSearch(val)
          setPage(1)
        }}
        isLoading={isLoading}
      />
      <Navigation
        pageInfo={pageInfo}
        loading={isLoading}
        page={page}
        setPage={(page) => setPage(page)}
      />
    </>
  )
}
