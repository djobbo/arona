import {
  type APIAttachment,
  type Attachment,
  type AttachmentBuilder,
  type AttachmentPayload,
  type BufferResolvable,
  type JSONEncodable,
} from "discord.js"
import type { Stream } from "node:stream"

export type AronaProps<T> = Omit<T, "type" | "id" | "customId">

export type FileAttachment =
  | string
  | BufferResolvable
  | Stream
  | JSONEncodable<APIAttachment>
  | Attachment
  | AttachmentBuilder
  | AttachmentPayload
