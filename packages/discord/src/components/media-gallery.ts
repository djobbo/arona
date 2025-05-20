import { type AronaNode, defineComponent } from "@arona/core"
import {
	type APIMediaGalleryComponent,
	type APIMediaGalleryItem,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
} from "discord.js"
import type { ReactNode } from "react"

export interface MediaProps extends APIMediaGalleryItem {}

const renderBaseMedia = (node: AronaNode<MediaProps>) => {
	const item = new MediaGalleryItemBuilder(node.props).toJSON()

	return {
		component: item,
	}
}

export const mediaComponent = defineComponent({
	name: "arona:media",
	allowedChildren: [],
	render: () => (node: AronaNode<MediaProps>) => {
		const { component } = renderBaseMedia(node)

		return {
			components: [component],
		}
	},
})

export const mediaWithGalleryComponent = defineComponent({
	name: mediaComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<MediaProps>) => {
		const { component } = renderBaseMedia(node)
		const gallery = new MediaGalleryBuilder({ items: [component] })

		return {
			components: [gallery],
		}
	},
})

export interface GalleryProps extends Omit<APIMediaGalleryComponent, "items"> {
	children?: ReactNode
}

export const galleryComponent = defineComponent({
	name: "arona:gallery",
	allowedChildren: [mediaComponent],
	render: (renderChildren) => (node: AronaNode<GalleryProps>) => {
		const items = renderChildren(node.children)

		if (items.length === 0) {
			console.warn(
				`Gallery ${node.uuid} has no items. It will not be rendered.`,
			)
			return null
		}

		const gallery = new MediaGalleryBuilder({
			items: items.flatMap(({ components }) => components),
		})

		return {
			components: [gallery],
		}
	},
})
