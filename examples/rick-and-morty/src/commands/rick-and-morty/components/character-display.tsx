import { Button, Container, Section, Text, Thumbnail } from "@arona/discord"
import { useCharacterSearch } from "../hooks/character-search-provider"
import type { CharacterStatus } from "../types"
import type { ColorResolvable } from "discord.js"

const getCharacterStatusColor = (status: CharacterStatus): ColorResolvable => {
  switch (status) {
    case "Alive":
      return "Green"
    case "Dead":
      return "Red"
    default:
      return "Default"
  }
}

export const CharacterDisplay = () => {
  const { character } = useCharacterSearch()

  if (!character) {
    return (
      <Container>
        <Text>No character selected</Text>
      </Container>
    )
  }

  return (
    <Container
      accentColor={getCharacterStatusColor(character.status ?? "unknown")}
    >
      <Section accessory={<Thumbnail media={{ url: character.image }} />}>
        <Text>
          {character.name} `{character.species}`
        </Text>
      </Section>
      <Text>{character.status}</Text>
    </Container>
  )
}
