import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

export interface LinkButtonOptions<Msg, C extends View.Children<Msg>> {
  readonly url: string;
  readonly disabled?: boolean;
  readonly children: C;
}

/** A button that opens a URL. */
export const LinkButton = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { url, disabled, children }: LinkButtonOptions<Msg, C>,
) =>
  h.linkButton
    .prop("url", url)
    .prop("disabled", disabled ?? false)
    .children(children);
