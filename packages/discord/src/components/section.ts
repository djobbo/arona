import type { View } from "@effect/ui";
import type * as Discord from "../vocabulary";

export interface SectionOptions<Msg, C extends View.Children<Msg>> {
  /** A button or thumbnail builder rendered as the section accessory. */
  readonly accessory: View.ElementBuilder<Msg, any, any, any, any>;
  readonly children: C;
}

/** A text section with one accessory, such as a button. */
export const Section = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  { accessory, children }: SectionOptions<Msg, C>,
) => h.section.children(children, accessory.attr("role", "accessory").key("accessory"));
