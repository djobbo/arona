import type { View } from "@effect/ui";
import type * as Slack from "../vocabulary";

export interface ActionsOptions<Msg, C extends View.Children<Msg>> {
  readonly children: C;
}

/** A Slack Actions block. Its children should be Buttons. */
export const Actions = <Msg, C extends View.Children<Msg>>(
  h: Slack.H<Msg>,
  options: ActionsOptions<Msg, C>,
) => h.actions.children(options.children);
