import type { Stream } from "node:stream"
import type {
	APIAttachment,
	Attachment,
	AttachmentBuilder,
	AttachmentPayload,
	BufferResolvable,
	JSONEncodable,
} from "discord.js"

export type AronaDiscordProps<T> = Omit<T, "id" | "type">

export type FileAttachment =
	| string
	| BufferResolvable
	| Stream
	| JSONEncodable<APIAttachment>
	| Attachment
	| AttachmentBuilder
	| AttachmentPayload
