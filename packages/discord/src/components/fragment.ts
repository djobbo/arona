import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

export interface FragmentOptions<Msg, C extends View.Children<Msg>> {
  readonly children: C;
}

/**
 * Groups renderer children without adding a Discord component.
 *
 * A message root renders one view, so a fragment is how a view returns several
 * top-level components such as a section, a container, and action rows.
 */
export const Fragment = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { children }: FragmentOptions<Msg, C>,
) => h.fragment.children(children);
