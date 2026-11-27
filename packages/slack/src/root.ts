import type { BotMessageRoot } from "@arona/core";
import type { SlackHost } from "./host";
import type { SlackActionPayload, SlackBlock, SlackMessage } from "./types";

/** The explicit lifecycle handle for one Slack message. */
export type SlackMessageRoot = BotMessageRoot<
  SlackHost,
  SlackMessage,
  ReadonlyArray<SlackBlock>,
  SlackActionPayload
>;
