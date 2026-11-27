import type { View } from "@effect/ui";
import type { ButtonInteraction } from "discord.js";
import * as Discord from "../vocabulary";

export type ButtonStyleName = "Primary" | "Secondary" | "Success" | "Danger";

export interface ButtonOptions<Msg, C extends View.Children<Msg>> {
  readonly style?: ButtonStyleName;
  readonly disabled?: boolean;
  /** Sends a message when Discord reports a click. */
  readonly onClick?: View.Handler<Msg, ButtonInteraction>;
  readonly children: C;
}

/**
 * An interactive button.
 *
 * A button is a pure element builder, not a headless component: a section
 * accessory has to be an element, and a builder can be used inline anywhere.
 */
export const Button = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: ButtonOptions<Msg, C>,
) => {
  const base = h.button
    .attr("style", options.style)
    .attr("disabled", options.disabled ? "" : undefined);
  return options.onClick === undefined
    ? base.children(options.children)
    : base.on("click", options.onClick).children(options.children);
};
