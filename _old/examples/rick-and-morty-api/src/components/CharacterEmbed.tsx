import { Embed } from "reaccord"
import type { Character, CharacterStatus } from "../types"
import type { ColorResolvable } from "discord.js"

const getColorFromCharacterStatus = (
  status: CharacterStatus,
): ColorResolvable => {
  switch (status) {
    case "Alive":
      return "Green"
    case "Dead":
      return "Red"
    default:
      return "Default"
  }
}

type CharacterEmbedProps = {
  character?: Character
  isLoading?: boolean
}

export const CharacterEmbed = ({
  character,
  isLoading,
}: CharacterEmbedProps) => {
  if (isLoading)
    return (
      <Embed color="Orange">
        <Embed.Title>Loading</Embed.Title>
      </Embed>
    )

  if (!character)
    return (
      <Embed color="Red">
        <Embed.Title>Failed to fetch data, please retry</Embed.Title>
      </Embed>
    )

  return (
    <Embed color={getColorFromCharacterStatus(character.status ?? "unknown")}>
      <Embed.Title>{character.name}</Embed.Title>
      <Embed.Field title="Species" inline>
        {character.species ?? "unknown"}
      </Embed.Field>
      <Embed.Field title="Status">{character.status ?? "unknown"}</Embed.Field>
      <Embed.Field title="Current location" inline>
        {character.location.name ?? "unknown"}
      </Embed.Field>
      <Embed.Field title="Origin">
        {character.origin.name ?? "unknown"}
      </Embed.Field>
      {character.image && <Embed.Thumbnail src={character.image} />}
    </Embed>
  )
}
