import { Component, View } from "@effect/ui";
import * as Context from "effect/Context";
import type {
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  MentionableSelectMenuInteraction,
  RoleSelectMenuInteraction,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js";
import type { DiscordHost } from "./host";
import type { DiscordNode } from "./node";
import type { ModalSubmitPayload } from "./types";

/** Every element the Discord vocabulary knows how to serialize. */
export const discordTags = [
  "fragment",
  "container",
  "text",
  "section",
  "actionRow",
  "button",
  "linkButton",
  "select",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
  "option",
  "separator",
  "thumbnail",
  "media",
  "gallery",
  "file",
  "canvas",
  "modal",
  "textInput",
  "label",
  "fileUpload",
  "checkbox",
  "checkboxGroup",
  "radioGroup",
] as const;

export type DiscordTag = (typeof discordTags)[number];

/** The interaction payloads each tag can send to a view handler. */
export interface DiscordEvents {
  readonly button: { readonly click: ButtonInteraction };
  readonly select: { readonly change: StringSelectMenuInteraction };
  readonly userSelect: { readonly change: UserSelectMenuInteraction };
  readonly roleSelect: { readonly change: RoleSelectMenuInteraction };
  readonly mentionableSelect: {
    readonly change: MentionableSelectMenuInteraction;
  };
  readonly channelSelect: { readonly change: ChannelSelectMenuInteraction };
  readonly modal: { readonly submit: ModalSubmitPayload };
  readonly [tag: string]: Record<string, unknown>;
}

type EventsOf<Tag extends string> = Tag extends keyof DiscordEvents
  ? DiscordEvents[Tag]
  : Record<string, never>;

/** The typed element builder for one Discord tag. */
export type DiscordElement<Msg, Tag extends string = string> = View.ContainerBuilder<
  Msg,
  never,
  EventsOf<Tag>,
  DiscordNode,
  Tag
>;

/** The element constructors installed on `h`. */
export type Tags<Msg> = {
  readonly [K in DiscordTag]: View.Shorthand<DiscordElement<Msg, K>>;
};

/**
 * The type-level Discord vocabulary.
 *
 * A host layer provides `Host`, so mounting a Discord root on another host is
 * a type error.
 */
export interface Elements extends View.Elements {
  readonly Tags: Tags<this["Msg"]>;
  readonly Host: Host;
}

/** The host marker: a Discord host provides it while a tree is mounted. */
export class Host extends Context.Service<Host, DiscordHost>()("@arona/discord/Host") {}

/** Phantom: makes this module namespace a `View.Vocabulary<Elements>`. */
export const Elements: Elements | undefined = undefined;

export const name = "discord";

const makeTags = (): Readonly<Record<string, DiscordElement<any>>> => {
  const out: Record<string, DiscordElement<any>> = {};
  for (const tag of discordTags) {
    out[tag] = View.shorthand(
      new View.ContainerBuilder<any, never, Record<string, unknown>, DiscordNode, any>(
        tag,
      ) as DiscordElement<any, any>,
    );
  }
  return out;
};

/** The root element builders shared by every render. */
export const tags = makeTags();

/** The runtime half of the vocabulary. */
export const vocabulary: View.Vocabulary<Elements> = { name, tags };

/** Defines a component with the Discord element vocabulary supplied. */
export const component: Component.Define<Elements> = Component.withElements(vocabulary);

/** The view helper bound to a component's message type. */
export type H<Msg> = View.WithTags<Msg, unknown, Elements>;
