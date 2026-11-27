import { AttachmentBuilder } from "discord.js";

export type Attachment = string | InstanceType<typeof AttachmentBuilder>["attachment"];

let counter = 0;

/** Creates an attachment and the `attachment://` URL that refers to it. */
export const createAttachment = (file: Attachment, name?: string) => {
  const fileName = name ?? `attachment-${++counter}`;
  return {
    data: new AttachmentBuilder(file).setName(fileName),
    url: `attachment://${fileName}`,
  };
};
