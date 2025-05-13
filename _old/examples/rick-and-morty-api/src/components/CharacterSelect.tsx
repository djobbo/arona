import { SelectMenu } from "reaccord"
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

export const CharacterSelect = ({
  characters,
  character,
  onSelectCharacter,
  isLoading,
}: CharacterSelectProps) => {
  return (
    <SelectMenu
      onChange={([val]) => onSelectCharacter(val)}
      disabled={isLoading}
    >
      {characters.map((char, i) => (
        <SelectMenu.Option
          key={char.id}
          value={char.id.toString()}
          description={`${char.species} - ${char.status}`}
          selected={character ? char.id === character.id : i === 0}
          emoji={statusEmojis[char.status] ?? "❔"}
        >
          {char.name}
        </SelectMenu.Option>
      ))}
    </SelectMenu>
  )
}
