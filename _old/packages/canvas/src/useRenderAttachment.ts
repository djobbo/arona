import { AttachmentBuilder } from "discord.js"
import { renderToImageBuffer } from "./render"
import { useQuery } from "@tanstack/react-query"
import { v4 as uuidv4 } from "uuid"
import type { QueryKey, UseQueryOptions } from "@tanstack/react-query"
import type { ReactElement } from "react"
import type { RenderContext, RenderOptions } from "./render"

export type RenderImageFileQueryOptions<TQueryKey extends QueryKey> = {
  queryOptions?: UseQueryOptions<
    AttachmentBuilder,
    unknown,
    AttachmentBuilder,
    TQueryKey
  >
} & RenderOptions

/**
 * A valid `@tanstack/react-query` setup is required for this hook to work.
 * @see https://tanstack.com/query/v4/docs/quick-start
 */
export const useRenderImageFile = <TQueryKey extends QueryKey>(
  queryKey: TQueryKey,
  Element: (props: RenderContext) => ReactElement,
  {
    queryOptions,
    ...renderOptions
  }: RenderImageFileQueryOptions<TQueryKey> = {},
) => {
  const { data: imageFile, ...query } = useQuery({
    queryKey,
    queryFn: async () => {
      const imageBuffer = await renderToImageBuffer(Element, renderOptions)

      const imageFile = new AttachmentBuilder(imageBuffer).setName(
        `${uuidv4()}.${renderOptions.screenshotOptions?.type ?? "png"}`,
      )

      return imageFile
    },
    ...queryOptions,
  })

  return {
    imageFile,
    imageFilename: imageFile?.name,
    imageAttachmentName: imageFile?.name
      ? `attachment://${imageFile.name}`
      : undefined,
    ...query,
  }
}
