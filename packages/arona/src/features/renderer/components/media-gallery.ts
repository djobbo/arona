import {
  type APIMediaGalleryComponent,
  type APIMediaGalleryItem,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
} from "discord.js"
import { defineComponent } from "../helpers/define-component"
import { isContainerComponent } from "./container"
import { isRootNode } from "../nodes/root"
import type { ReactNode } from "react"

interface MediaProps extends APIMediaGalleryItem {}

export const {
  name: MEDIA_ELEMENT,
  component: Media,
  render: renderMediaComponent,
  guard: isMediaComponent,
} = defineComponent<MediaProps, APIMediaGalleryItem>("arona:media", (node) => {
  const item = new MediaGalleryItemBuilder(node.props).toJSON()

  if (isRootNode(node.parent) || isContainerComponent(node.parent)) {
    // If this is a media item at the root level or inside a container, we create a gallery component

    const gallery = new MediaGalleryBuilder({
      items: [item],
    })

    return {
      components: [gallery],
      files: [],
      interactionListeners: [],
    }
  }

  if (isGalleryComponent(node.parent)) {
    // If this is a media item inside a gallery, we don't need to return it as a separate component
    return {
      components: [],
      files: [],
      interactionListeners: [],
      misc: item,
    }
  }

  throw new Error(
    `Unexpected element type: ${node.type} inside ${node.parent?.type}`,
  )
})

interface GalleryProps extends Omit<APIMediaGalleryComponent, "items"> {
  children?: ReactNode
}

export const {
  name: GALLERY_ELEMENT,
  component: Gallery,
  render: renderGalleryComponent,
  guard: isGalleryComponent,
} = defineComponent<GalleryProps>("arona:gallery", (node) => {
  const items = node.children
    // TODO: throw if there are invalid items
    .filter(isMediaComponent)
    .map((item) => renderMediaComponent(item).misc)
    .filter((item) => !!item)

  if (items.length === 0) {
    console.warn(`Gallery ${node.uuid} has no items. It will not be rendered.`)

    return {
      components: [],
      files: [],
      interactionListeners: [],
    }
  }

  const gallery = new MediaGalleryBuilder({ items })

  return {
    components: [gallery],
    files: [],
    interactionListeners: [],
  }
})
