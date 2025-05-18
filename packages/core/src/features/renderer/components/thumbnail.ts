import {
  SeparatorBuilder,
  ThumbnailBuilder,
  type ThumbnailComponentData,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"

interface ThumbnailProps extends ThumbnailComponentData {}

export const {
  name: THUMBNAIL_ELEMENT,
  component: Thumbnail,
  render: renderThumbnailComponent,
  guard: isThumbnailComponent,
} = defineComponent<ThumbnailProps>("arona:thumbnail", (node) => {
  const thumbnail = new ThumbnailBuilder({
    ...node.props,
  })

  return {
    components: [thumbnail],
    files: [],
    interactionListeners: [],
  }
})
