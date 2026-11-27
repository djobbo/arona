import type {
  Attachment as DiscordAttachment,
  AttachmentBuilder,
  ButtonInteraction,
  ChannelSelectMenuInteraction,
  ChatInputCommandInteraction,
  ContextMenuCommandInteraction,
  MentionableSelectMenuInteraction,
  Message,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  RoleSelectMenuInteraction,
  SendableChannels,
  StringSelectMenuInteraction,
  UserSelectMenuInteraction,
} from "discord.js";
import type { TelemetryHandle } from "@arona/core";
import type { DiscordNode } from "./node";

/** Anything Arona can render a message into. */
export type InteractionRef =
  | SendableChannels
  | Message
  | ChatInputCommandInteraction
  | ContextMenuCommandInteraction
  | ModalSubmitInteraction
  | MessageComponentInteraction;

export interface MessageRenderOptions {
  /** Reply ephemerally. Only applies to interactions. */
  readonly ephemeral?: boolean;
  /** Unmount after this many milliseconds. */
  readonly unmountAfter?: number;
  /** Continue this message instead of creating a new one. */
  readonly resume?: Message | undefined;
  /**
   * With `resume`, drop the first restored render. The caller is about to
   * apply an interaction, so only the post-interaction state should be sent.
   */
  readonly skipInitial?: boolean | undefined;
  /** Telemetry runtime for this message. Defaults to the process-wide runtime. */
  readonly telemetry?: TelemetryHandle | undefined;
}

/** What the host hands the message target after each commit. */
export interface MessageSnapshot {
  readonly components: ReadonlyArray<unknown>;
  readonly files: ReadonlyArray<AttachmentBuilder>;
}

/** A modal the host wants shown, with the node that owns its handlers. */
export interface ModalRequest {
  readonly node: DiscordNode;
  readonly builder: import("discord.js").ModalBuilder;
}

/** Mentionable selections split by the kind of mentionable. */
export interface ModalMentionableValues {
  readonly users: ReadonlyArray<string>;
  readonly members: ReadonlyArray<string>;
  readonly roles: ReadonlyArray<string>;
}

/**
 * Every form value a modal submission can carry, keyed by each field's `name`
 * (or its generated custom id when no name was given).
 */
export interface ModalSubmitValues {
  /** Text input values. */
  readonly values: Readonly<Record<string, string>>;
  /** String, user, role, channel, and checkbox-group selections. */
  readonly selections: Readonly<Record<string, ReadonlyArray<string>>>;
  /** Mentionable select values, split by kind. */
  readonly mentionables: Readonly<Record<string, ModalMentionableValues>>;
  /** Checkbox values. */
  readonly checkboxes: Readonly<Record<string, boolean>>;
  /** Radio group values. */
  readonly radioGroups: Readonly<Record<string, string>>;
  /** Uploaded files. */
  readonly files: Readonly<Record<string, ReadonlyArray<DiscordAttachment>>>;
}

/** The payload a modal submit handler receives. */
export interface ModalSubmitPayload extends ModalSubmitValues {
  readonly interaction: ModalSubmitInteraction;
}

export type ButtonPayload = ButtonInteraction;
export type StringSelectPayload = StringSelectMenuInteraction;
export type UserSelectPayload = UserSelectMenuInteraction;
export type RoleSelectPayload = RoleSelectMenuInteraction;
export type MentionableSelectPayload = MentionableSelectMenuInteraction;
export type ChannelSelectPayload = ChannelSelectMenuInteraction;
/** @deprecated Use the per-kind select payload aliases. */
export type SelectPayload = StringSelectMenuInteraction;
