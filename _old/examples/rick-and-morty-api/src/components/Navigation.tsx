import { ActionRow, Button } from "reaccord"
import { ButtonStyle } from "discord.js"
import type { PageInfo } from "../types"

type NavigationProps = {
  pageInfo?: PageInfo
  setPage: (page: number) => void
  loading: boolean
  page: number
}

export const Navigation = ({
  pageInfo,
  setPage,
  loading,
  page,
}: NavigationProps) => {
  const setCurrentPage = (newPage: number) => {
    if (!pageInfo) return setPage(1)

    if (newPage > pageInfo.pages) return setPage(pageInfo.pages)
    if (newPage < 1) return setPage(1)

    return setPage(newPage)
  }

  return (
    <ActionRow>
      <Button
        style={ButtonStyle.Secondary}
        onClick={() => setCurrentPage(1)}
        disabled={loading || page <= 1}
      >
        {"<<"}
      </Button>
      <Button
        style={ButtonStyle.Primary}
        onClick={() => setCurrentPage(page - 1)}
        disabled={loading || page <= 1}
      >
        {"<"}
      </Button>
      <Button style={ButtonStyle.Secondary} disabled>
        Page {page}
        {pageInfo && ` / ${pageInfo.pages}`}
      </Button>
      <Button
        style={ButtonStyle.Primary}
        onClick={() => setCurrentPage(page + 1)}
        disabled={loading || (!!pageInfo && pageInfo.pages <= page)}
      >
        {">"}
      </Button>
      <Button
        style={ButtonStyle.Secondary}
        onClick={() => setCurrentPage(pageInfo?.pages ?? 1)}
        disabled={loading || (!!pageInfo && pageInfo.pages <= page)}
      >
        {">>"}
      </Button>
    </ActionRow>
  )
}
