import { ActionRow, Button } from "@arona/discord"
import { ButtonStyle } from "discord.js"
import { useCharacterSearch } from "../hooks/character-search-provider"

export const Navigation = () => {
  const { page, setPage, pageMetadata, isLoading } = useCharacterSearch()
  const setCurrentPage = (newPage: number) => {
    if (!pageMetadata) return setPage(1)

    if (newPage > pageMetadata.pages) return setPage(pageMetadata.pages)
    if (newPage < 1) return setPage(1)

    return setPage(newPage)
  }

  const canInteract = !isLoading && !!pageMetadata && pageMetadata.pages > 0

  return (
    <ActionRow>
      <Button
        style={ButtonStyle.Secondary}
        onClick={() => setCurrentPage(1)}
        disabled={!canInteract || page <= 1}
      >
        {"<<"}
      </Button>
      <Button
        style={ButtonStyle.Primary}
        onClick={() => setCurrentPage(page - 1)}
        disabled={!canInteract || page <= 1}
      >
        {"<"}
      </Button>
      <Button style={ButtonStyle.Secondary} disabled>
        Page {page}
        {pageMetadata && ` / ${pageMetadata.pages}`}
      </Button>
      <Button
        style={ButtonStyle.Primary}
        onClick={() => setCurrentPage(page + 1)}
        disabled={
          !canInteract || (!!pageMetadata && pageMetadata.pages <= page)
        }
      >
        {">"}
      </Button>
      <Button
        style={ButtonStyle.Secondary}
        onClick={() => setCurrentPage(pageMetadata?.pages ?? 1)}
        disabled={
          !canInteract || (!!pageMetadata && pageMetadata.pages <= page)
        }
      >
        {">>"}
      </Button>
    </ActionRow>
  )
}
