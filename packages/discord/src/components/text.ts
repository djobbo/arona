import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

/** A Discord text display. Children are rendered as markdown. */
export const Text = <Msg>(h: Discord.H<Msg>, ...content: View.Children<Msg>) =>
  h.text.children(...content);
