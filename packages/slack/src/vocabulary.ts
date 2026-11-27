import { Component, View } from "@effect/ui";
import * as Context from "effect/Context";
import type { SlackHost } from "./host";
import type { BotNode } from "@arona/core";
import type { SlackActionPayload } from "./types";

export const slackTags = [
  "blocks",
  "section",
  "text",
  "markdown",
  "actions",
  "button",
  "divider",
] as const;

export type SlackTag = (typeof slackTags)[number];

export interface SlackEvents {
  readonly button: { readonly click: SlackActionPayload };
  readonly [tag: string]: Record<string, unknown>;
}

type EventsOf<Tag extends string> = Tag extends keyof SlackEvents
  ? SlackEvents[Tag]
  : Record<string, never>;

export type SlackElement<Msg, Tag extends string = string> = View.ContainerBuilder<
  Msg,
  never,
  EventsOf<Tag>,
  BotNode,
  Tag
>;

export type Tags<Msg> = {
  readonly [K in SlackTag]: View.Shorthand<SlackElement<Msg, K>>;
};

export interface Elements extends View.Elements {
  readonly Tags: Tags<this["Msg"]>;
  readonly Host: Host;
}

export class Host extends Context.Service<Host, SlackHost>()("@arona/slack/Host") {}

export const Elements: Elements | undefined = undefined;

export const name = "slack";

const makeTags = (): Readonly<Record<string, SlackElement<any>>> => {
  const out: Record<string, SlackElement<any>> = {};
  for (const tag of slackTags) {
    out[tag] = View.shorthand(
      new View.ContainerBuilder<any, never, Record<string, unknown>, BotNode, any>(
        tag,
      ) as SlackElement<any, any>,
    );
  }
  return out;
};

export const tags = makeTags();

export const vocabulary: View.Vocabulary<Elements> = { name, tags };

export const component: Component.Define<Elements> = Component.withElements(vocabulary);

export type H<Msg> = View.WithTags<Msg, unknown, Elements>;
