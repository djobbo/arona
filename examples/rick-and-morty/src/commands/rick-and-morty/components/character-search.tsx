import { Button, Section, Text, useModal } from "@arona/discord"
import { CharacterSearchModal } from "./character-search-modal"
import { useCharacterSearch } from "../hooks/character-search-provider"

export const CharacterSearch = () => {
  const { search, setSearch } = useCharacterSearch()
  const { openModal } = useModal()

  return (
    <Section
      accessory={
        <Button
          onClick={openModal(() => (
            <CharacterSearchModal search={search} setSearch={setSearch} />
          ))}
        >
          Search
        </Button>
      }
    >
      <Text>### Search Character</Text>
      {search ? (
        <Text>Current search: {search}</Text>
      ) : (
        <Text>No search term set.</Text>
      )}
    </Section>
  )
}
