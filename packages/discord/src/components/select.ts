import { type View } from "@effect/ui";
import { Schema } from "effect";
import type { StringSelectMenuInteraction } from "discord.js";
import * as Discord from "../vocabulary";

export interface OptionProps {
  readonly value: string;
  readonly label?: string;
  readonly description?: string;
  readonly selected?: boolean;
  readonly emoji?: unknown;
}

/** One option of a string select menu. */
export const Option = <Msg>(h: Discord.H<Msg>, props: OptionProps) => {
  let option = h.option.prop("value", props.value);
  if (props.label !== undefined) option = option.prop("label", props.label);
  if (props.description !== undefined) {
    option = option.prop("description", props.description);
  }
  if (props.selected !== undefined) option = option.prop("selected", props.selected);
  if (props.emoji !== undefined) option = option.prop("emoji", props.emoji);
  return option.children(props.label ?? props.value);
};

const SelectProps = Schema.Struct({
  placeholder: Schema.optional(Schema.String),
  disabled: Schema.optional(Schema.Boolean),
  minValues: Schema.optional(Schema.Number),
  maxValues: Schema.optional(Schema.Number),
  required: Schema.optional(Schema.Boolean),
  name: Schema.optional(Schema.String),
});

export const selectComponent = Discord.component({
  name: "Select",
  props: SelectProps,
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  parts: (p) => ({
    select: p.part("select", (builder) =>
      builder
        .attr("placeholder", p.props.placeholder)
        .attr("disabled", p.props.disabled ? "" : undefined)
        .attr("minValues", p.props.minValues?.toString())
        .attr("maxValues", p.props.maxValues?.toString())
        .attr(
          "required",
          p.props.required === undefined ? undefined : p.props.required ? "" : "false",
        )
        .attr("name", p.props.name),
    ),
  }),
});

export interface SelectOptions<Msg, C extends View.Children<Msg>> {
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly required?: boolean;
  readonly name?: string;
  /** Sends a message with the interaction when the selection changes. */
  readonly onChange?: View.Handler<Msg, StringSelectMenuInteraction>;
  readonly children: C;
}

/** A string select menu. */
export const Select = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: SelectOptions<Msg, C>,
) =>
  selectComponent(h, {
    props: {
      placeholder: options.placeholder,
      disabled: options.disabled,
      minValues: options.minValues,
      maxValues: options.maxValues,
      required: options.required,
      name: options.name,
    },
    view: (select) => {
      const base = select.select(h.select);
      return options.onChange === undefined
        ? base.children(options.children)
        : base.on("change", options.onChange).children(options.children);
    },
  });

/** Shared options for the auto-populated select menu variants. */
export interface AutoSelectOptions<Msg, C extends View.Children<Msg>, Interaction> {
  readonly placeholder?: string;
  readonly disabled?: boolean;
  readonly minValues?: number;
  readonly maxValues?: number;
  /** Whether the select must be answered in a modal. */
  readonly required?: boolean;
  readonly name?: string;
  /** Sends a message with the interaction when the selection changes. */
  readonly onChange?: View.Handler<Msg, Interaction>;
  readonly children?: C;
}

export interface UserSelectOptions<Msg, C extends View.Children<Msg>> extends AutoSelectOptions<
  Msg,
  C,
  import("discord.js").UserSelectMenuInteraction
> {
  readonly defaultUsers?: ReadonlyArray<string>;
}

/** A select menu for guild members. */
export const UserSelect = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: UserSelectOptions<Msg, C>,
) => {
  const base = h.userSelect
    .prop("defaultUsers", options.defaultUsers)
    .attr("placeholder", options.placeholder)
    .attr("disabled", options.disabled ? "" : undefined)
    .attr("minValues", options.minValues?.toString())
    .attr("maxValues", options.maxValues?.toString())
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .attr("name", options.name);
  const withChildren = options.children ? base.children(options.children) : base;
  return options.onChange === undefined
    ? withChildren
    : withChildren.on("change", options.onChange);
};

export interface RoleSelectOptions<Msg, C extends View.Children<Msg>> extends AutoSelectOptions<
  Msg,
  C,
  import("discord.js").RoleSelectMenuInteraction
> {
  readonly defaultRoles?: ReadonlyArray<string>;
}

/** A select menu for guild roles. */
export const RoleSelect = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: RoleSelectOptions<Msg, C>,
) => {
  const base = h.roleSelect
    .prop("defaultRoles", options.defaultRoles)
    .attr("placeholder", options.placeholder)
    .attr("disabled", options.disabled ? "" : undefined)
    .attr("minValues", options.minValues?.toString())
    .attr("maxValues", options.maxValues?.toString())
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .attr("name", options.name);
  const withChildren = options.children ? base.children(options.children) : base;
  return options.onChange === undefined
    ? withChildren
    : withChildren.on("change", options.onChange);
};

export interface MentionableSelectOptions<
  Msg,
  C extends View.Children<Msg>,
> extends AutoSelectOptions<Msg, C, import("discord.js").MentionableSelectMenuInteraction> {
  readonly defaultUsers?: ReadonlyArray<string>;
  readonly defaultRoles?: ReadonlyArray<string>;
}

/** A select menu for members and roles. */
export const MentionableSelect = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: MentionableSelectOptions<Msg, C>,
) => {
  const base = h.mentionableSelect
    .prop("defaultUsers", options.defaultUsers)
    .prop("defaultRoles", options.defaultRoles)
    .attr("placeholder", options.placeholder)
    .attr("disabled", options.disabled ? "" : undefined)
    .attr("minValues", options.minValues?.toString())
    .attr("maxValues", options.maxValues?.toString())
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .attr("name", options.name);
  const withChildren = options.children ? base.children(options.children) : base;
  return options.onChange === undefined
    ? withChildren
    : withChildren.on("change", options.onChange);
};

export interface ChannelSelectOptions<Msg, C extends View.Children<Msg>> extends AutoSelectOptions<
  Msg,
  C,
  import("discord.js").ChannelSelectMenuInteraction
> {
  readonly channelTypes?: ReadonlyArray<number>;
  readonly defaultChannels?: ReadonlyArray<string>;
}

/** A select menu for channels. */
export const ChannelSelect = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: ChannelSelectOptions<Msg, C>,
) => {
  const base = h.channelSelect
    .prop("channelTypes", options.channelTypes)
    .prop("defaultChannels", options.defaultChannels)
    .attr("placeholder", options.placeholder)
    .attr("disabled", options.disabled ? "" : undefined)
    .attr("minValues", options.minValues?.toString())
    .attr("maxValues", options.maxValues?.toString())
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .attr("name", options.name);
  const withChildren = options.children ? base.children(options.children) : base;
  return options.onChange === undefined
    ? withChildren
    : withChildren.on("change", options.onChange);
};
