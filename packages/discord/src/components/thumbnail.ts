import type * as Discord from "../vocabulary";
import type { Attachment } from "./helpers/create-attachment";

export type ThumbnailSource =
  | { readonly url: string }
  | { readonly file: Attachment; readonly name?: string };

export type ThumbnailProps = ThumbnailSource & {
  readonly description?: string;
  readonly spoiler?: boolean;
};

/** A thumbnail, usually the accessory of a section. */
export const Thumbnail = <Msg>(h: Discord.H<Msg>, props: ThumbnailProps) =>
  ("url" in props
    ? h.thumbnail.prop("url", props.url)
    : h.thumbnail.prop("file", props.file).prop("name", props.name)
  )
    .prop("description", props.description)
    .prop("spoiler", props.spoiler);
