import { type AronaNode, defineComponent } from "@arona/core"
import {
	type APIMediaGalleryComponent,
	MediaGalleryBuilder,
	MediaGalleryItemBuilder,
	type MediaGalleryItemData,
} from "discord.js"
import type { ReactNode } from "react"
import type { AronaDiscordProps } from './types'
import { createAttachment, type Attachment } from './helpers/create-attachment'

export type MediaProps = Omit<AronaDiscordProps<MediaGalleryItemData>, "media"> & ({
	file: Attachment
	name?: string
} | {
	url: string
})

const renderBaseMedia = (node: AronaNode<MediaProps>) => {
	if ('file' in node.props && node.props.file) {
		const attachment = createAttachment(node.props.file, node.props.name ?? node.uuid)
		const item = new MediaGalleryItemBuilder({
				...node.props,
			media: {
				url: attachment.url
			}
		}).toJSON()

		return {
			component: item,
			files: [attachment.data]
		}
	}

	if ('url' in node.props && node.props.url) {
		const item = new MediaGalleryItemBuilder({
			...node.props,
		}).toJSON()

		return {
			component: item,
			files: [],
		}
	}

	return null
}

export const mediaComponent = defineComponent({
	name: "arona:media",
	allowedChildren: [],
	render: () => (node: AronaNode<MediaProps>) => {
		const media = renderBaseMedia(node)

		if (!media) {
			console.warn(`Media ${node.uuid} has no media. It will not be rendered.`)
			return null
		}

		return {
			components: [media.component],
			files: media.files,
		}
	},
})

export const mediaWithGalleryComponent = defineComponent({
	name: mediaComponent.name,
	allowedChildren: [],
	render: () => (node: AronaNode<MediaProps>) => {
		const media = renderBaseMedia(node)

		if (!media) {
			console.warn(`Media ${node.uuid} has no media. It will not be rendered.`)
			return null
		}

		const gallery = new MediaGalleryBuilder({ items: [media.component] })

		return {
			components: [gallery],
			files: media.files,
		}
	},
})

export interface GalleryProps extends Omit<AronaDiscordProps<APIMediaGalleryComponent>, "items"> {
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
