import { ActionRow, Button, useModal } from "reaccord"
import { ButtonStyle } from "discord.js"
import { CharacterSearchModal } from "./CharacterSearchModal"

type SearchCharacterRowProps = {
  search: string
  setSearch: (val: string) => void
  isLoading: boolean
}

export const SearchCharacterRow = ({
  search,
  setSearch,
  isLoading,
}: SearchCharacterRowProps) => {
  const { openModal } = useModal()

  const openCharacterSearchModal = openModal(() => (
    <CharacterSearchModal search={search} setSearch={setSearch} />
  ))

  return (
    <ActionRow>
      <Button
        style={ButtonStyle.Primary}
        onClick={openCharacterSearchModal}
        disabled={isLoading}
      >
        Search Character 🔎
      </Button>
      {search && (
        <>
          <Button style={ButtonStyle.Secondary} disabled>
            Current search: {search}
          </Button>
          <Button
            style={ButtonStyle.Secondary}
            onClick={() => setSearch("")}
            disabled={isLoading}
          >
            Clear search
          </Button>
        </>
      )}
    </ActionRow>
  )
}
