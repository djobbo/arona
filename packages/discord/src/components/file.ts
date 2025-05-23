import { type AronaNode, defineComponent } from "@arona/core"
import {
	FileBuilder,
	type FileComponentData,
} from "discord.js"
import type { AronaDiscordProps } from './types'
import { createAttachment, type Attachment } from './helpers/create-attachment'

export interface FileProps extends Omit<AronaDiscordProps<FileComponentData>, "file"> {
	file: Attachment
	name?: string
}

export const fileComponent = defineComponent({
	name: "arona:file",
	allowedChildren: [],
	render: () => (node: AronaNode<FileProps>) => {
		const { file: fileProp, name, ...props } = node.props
		
		if (!fileProp) {
			console.warn(`File ${node.uuid} has no file. It will not be rendered.`)
			return null
		}

		const attachment = createAttachment(fileProp, name ?? node.uuid)

		const file = new FileBuilder({
			file: {
				url: attachment.url
			},
			...props,
		})

		return {
			components: [file],
			files: [attachment.data],
		}
	},
})
