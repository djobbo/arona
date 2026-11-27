import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

export interface ActionRowOptions<Msg, C extends View.Children<Msg>> {
  readonly children: C;
}

/** A row holding interactive components such as buttons and selects. */
export const ActionRow = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { children }: ActionRowOptions<Msg, C>,
) => h.actionRow.children(children);
