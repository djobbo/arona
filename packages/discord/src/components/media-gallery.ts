import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";
import type { Attachment } from "./helpers/create-attachment";

export type MediaSource =
  | { readonly url: string }
  | { readonly file: Attachment; readonly name?: string };

export type MediaProps = MediaSource & {
  readonly description?: string;
  readonly spoiler?: boolean;
};

/** One image or video in a gallery. */
export const Media = <Msg>(h: Discord.H<Msg>, props: MediaProps) =>
  ("url" in props
    ? h.media.prop("url", props.url)
    : h.media.prop("file", props.file).prop("name", props.name)
  )
    .prop("description", props.description)
    .prop("spoiler", props.spoiler);

export interface GalleryOptions<Msg, C extends View.Children<Msg>> {
  readonly children: C;
}

/** A gallery of media items. */
export const Gallery = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { children }: GalleryOptions<Msg, C>,
) => h.gallery.children(children);
