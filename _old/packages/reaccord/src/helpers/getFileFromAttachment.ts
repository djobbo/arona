import { AttachmentBuilder } from "discord.js"
import { Buffer } from "node:buffer"
import { Stream } from "node:stream"
import type { FileAttachment } from "../jsx"

const getAttachmentNameFromFilename = (filename: string): string =>
  `attachment://${filename}`

// TODO: add a way to change file extension
export const getFileFromAttachment = (
  attachment: FileAttachment,
  nodeUuid: string,
): { file: FileAttachment; filename: string } => {
  const name = `${nodeUuid}.png`
  if (attachment instanceof AttachmentBuilder) {
    attachment.setName(name)

    return {
      file: attachment,
      filename: getAttachmentNameFromFilename(name),
    }
  }

  if (
    typeof attachment === "string" ||
    attachment instanceof Buffer ||
    attachment instanceof Stream
  ) {
    return {
      file: new AttachmentBuilder(attachment).setName(name),
      filename: getAttachmentNameFromFilename(name),
    }
  }

  attachment.name = name

  return {
    file: attachment,
    filename: getAttachmentNameFromFilename(name),
  }
}
