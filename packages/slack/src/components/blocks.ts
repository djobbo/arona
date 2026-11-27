import type { View } from "@effect/ui";
import type * as Slack from "../vocabulary";

export interface BlocksOptions<Msg, C extends View.Children<Msg>> {
  readonly children: C;
}

/**
 * The explicit top-level Block Kit container.
 *
 * Slack has no root block, so a message with more than one block groups them
 * here. The serializer flattens this node into the message's block list.
 */
export const Blocks = <Msg, C extends View.Children<Msg>>(
  h: Slack.H<Msg>,
  options: BlocksOptions<Msg, C>,
) => h.blocks.children(options.children);
