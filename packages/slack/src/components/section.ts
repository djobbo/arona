import type { View } from "@effect/ui";
import type * as Slack from "../vocabulary";

export interface SectionOptions<Msg, C extends View.Children<Msg>> {
  /** A button rendered as the section accessory. */
  readonly accessory?: View.ElementBuilder<Msg, any, any, any, any>;
  readonly children: C;
}

/** A Slack Section block. It must contain a Text or Markdown child. */
export const Section = <Msg, C extends View.Children<Msg>>(
  h: Slack.H<Msg>,
  options: SectionOptions<Msg, C>,
) => {
  const base = h.section.children(options.children);
  return options.accessory === undefined
    ? base
    : base.children(options.accessory.attr("role", "accessory").key("accessory"));
};
