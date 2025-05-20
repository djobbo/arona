import { Modal, TextInput } from "@arona/discord"
import { TextInputStyle } from "discord.js"
import { useCharacterSearch } from "../hooks/character-search-provider"

interface CharacterSearchModalProps {
  search?: string
  setSearch: (search: string) => void
}

export const CharacterSearchModal = ({
  search,
  setSearch,
}: CharacterSearchModalProps) => {
  // This is not yet possible
  // Context is not shared between main app and modals
  // const { search, setSearch } = useCharacterSearch()

  return (
    <Modal title="Search Character">
      <TextInput
        style={TextInputStyle.Short}
        label="Search for a character by name"
        minLength={1}
        maxLength={50}
        placeholder="e.g. Rick Sanchez, Morty Smith, etc."
        value={search}
        onChange={(value) => {
          console.log("Search value changed:", value)
          setSearch(value ?? "")
        }}
      />
    </Modal>
  )
}
