import type { View } from "@effect/ui";
import type * as Slack from "../vocabulary";

/** A Slack plain-text element. It must be placed inside a Section. */
export const Text = <Msg>(h: Slack.H<Msg>, ...content: View.Children<Msg>) =>
  h.text.children(...content);

/** A Slack mrkdwn element. It must be placed inside a Section. */
export const Markdown = <Msg>(h: Slack.H<Msg>, ...content: View.Children<Msg>) =>
  h.markdown.children(...content);
