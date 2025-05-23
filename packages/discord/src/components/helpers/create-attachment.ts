import { AttachmentBuilder } from "discord.js"

export type Attachment = string | InstanceType<typeof AttachmentBuilder>['attachment']

export const createAttachment = (file: Attachment, name: string) => {
	return {
        data: new AttachmentBuilder(file).setName(name),
        url: `attachment://${name}`
    }
}