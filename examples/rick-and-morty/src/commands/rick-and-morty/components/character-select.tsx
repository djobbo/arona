import { Option, Select } from "@arona/core"
import { useCharacterSearch } from "../hooks/character-search-provider"
import type { Character, CharacterStatus } from "../types"

type CharacterSelectProps = {
  characters: Character[]
  character: Character | undefined
  onSelectCharacter: (val: string) => void
  isLoading?: boolean
}

const statusEmojis: Record<CharacterStatus, string> = {
  Alive: "🙂",
  Dead: "💀",
  unknown: "❓",
}

export const CharacterSelect = () => {
  const { character, characters, selectCharacter, isLoading } =
    useCharacterSearch()
  return (
    <Select onChange={([val]) => selectCharacter(val)} disabled={isLoading}>
      {characters.map((char, i) => (
        <Option
          key={char.id}
          value={char.id.toString()}
          description={`${char.species} - ${char.status}`}
          selected={character ? char.id === character.id : i === 0}
          emoji={statusEmojis[char.status] ?? "❔"}
        >
          {char.name}
        </Option>
      ))}
    </Select>
  )
}
