import type * as Discord from "../vocabulary";
import type { Attachment } from "./helpers/create-attachment";

export interface FileProps {
  readonly file: Attachment;
  readonly name?: string;
  readonly spoiler?: boolean;
}

/** A file attachment displayed as a Components V2 file component. */
export const File = <Msg>(h: Discord.H<Msg>, props: FileProps) =>
  h.file.prop("file", props.file).prop("name", props.name).prop("spoiler", props.spoiler);
