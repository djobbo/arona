import { type View } from "@effect/ui";
import { Schema } from "effect";
import type { TextInputStyle } from "discord.js";
import type { ModalSubmitPayload } from "../types";
import { Option } from "./select";
import * as Discord from "../vocabulary";

const ModalProps = Schema.Struct({
  title: Schema.String,
  customId: Schema.optional(Schema.String),
});

export const modalComponent = Discord.component({
  name: "Modal",
  props: ModalProps,
  model: Schema.Struct({}),
  message: Schema.Never,
}).make({
  init: () => ({}),
  update: ($) => $.model,
  parts: (p) => ({
    modal: p.part("modal", (builder) => {
      return builder.attr("title", p.props.title).attr("customId", p.props.customId);
    }),
  }),
});

export type TextInputStyleName = "Short" | "Paragraph";

export interface TextInputProps {
  /** The key the submitted value is exposed under. */
  readonly name?: string;
  readonly customId?: string;
  readonly style?: TextInputStyleName | TextInputStyle;
  readonly value?: string;
  readonly placeholder?: string;
  readonly required?: boolean;
  readonly minLength?: number;
  readonly maxLength?: number;
}

/** One text input inside a modal label. */
export const TextInput = <Msg>(h: Discord.H<Msg>, props: TextInputProps) =>
  h.textInput
    .attr("customId", props.customId)
    .prop("name", props.name)
    .prop("style", props.style)
    .prop("value", props.value)
    .prop("placeholder", props.placeholder)
    .prop("required", props.required)
    .prop("minLength", props.minLength)
    .prop("maxLength", props.maxLength);

export interface ModalOptions<Msg, C extends View.Children<Msg>> {
  readonly title: string;
  readonly customId?: string;
  /** Receives the submitted values, keyed by each input's `name`. */
  readonly onSubmit?: View.Handler<Msg, ModalSubmitPayload>;
  readonly children: C;
}

/**
 * A modal. Rendering it asks Discord to show it on the interaction that led to
 * this render; removing it from the view closes nothing, because Discord owns
 * the modal once shown.
 */
export const Modal = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: ModalOptions<Msg, C>,
) =>
  modalComponent(h, {
    props: { title: options.title, customId: options.customId },
    view: (modal) => {
      const base = modal.modal(h.modal);
      return options.onSubmit === undefined
        ? base.children(options.children)
        : base.on("submit", options.onSubmit).children(options.children);
    },
  });

export interface LabelOptions<Msg, C extends View.Children<Msg>> {
  readonly label: string;
  readonly description?: string;
  /** Exactly one field component. */
  readonly children: C;
}

/** Groups a field with its label and optional description. */
export const Label = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: LabelOptions<Msg, C>,
) =>
  h.label
    .attr("label", options.label)
    .attr("description", options.description)
    .children(options.children);

export interface CheckboxProps {
  /** The key the submitted value is exposed under. */
  readonly name?: string;
  readonly customId?: string;
  readonly defaultChecked?: boolean;
}

/** A single checkbox, used inside a modal. */
export const Checkbox = <Msg>(h: Discord.H<Msg>, props: CheckboxProps) =>
  h.checkbox
    .attr("customId", props.customId)
    .prop("name", props.name)
    .prop("default", props.defaultChecked);

export interface CheckboxGroupOptions<Msg, C extends View.Children<Msg>> {
  readonly name?: string;
  readonly customId?: string;
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly required?: boolean;
  readonly children: C;
}

/** One option of a checkbox group. Uses the same shape as a select option. */
export const CheckboxOption = Option;

/** A multi-select group of checkboxes, used inside a modal. */
export const CheckboxGroup = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: CheckboxGroupOptions<Msg, C>,
) =>
  h.checkboxGroup
    .attr("customId", options.customId)
    .attr("name", options.name)
    .attr("minValues", options.minValues?.toString())
    .attr("maxValues", options.maxValues?.toString())
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .children(options.children);

export interface RadioGroupOptions<Msg, C extends View.Children<Msg>> {
  readonly name?: string;
  readonly customId?: string;
  readonly required?: boolean;
  readonly children: C;
}

/** One option of a radio group. Uses the same shape as a select option. */
export const RadioOption = Option;

/** A single-choice group of radio options, used inside a modal. */
export const RadioGroup = <Msg, C extends View.Children<Msg>>(
  h: Discord.H<Msg>,
  options: RadioGroupOptions<Msg, C>,
) =>
  h.radioGroup
    .attr("customId", options.customId)
    .attr("name", options.name)
    .attr("required", options.required === undefined ? undefined : options.required ? "" : "false")
    .children(options.children);

export type FileUploadType = "audio" | "image" | "video" | `.${string}`;

export interface FileUploadProps {
  readonly name?: string;
  readonly customId?: string;
  readonly minValues?: number;
  readonly maxValues?: number;
  readonly fileTypes?: ReadonlyArray<FileUploadType>;
  readonly required?: boolean;
}

/** A file upload field, used inside a modal. */
export const FileUpload = <Msg>(h: Discord.H<Msg>, props: FileUploadProps) =>
  h.fileUpload
    .attr("customId", props.customId)
    .attr("name", props.name)
    .prop("minValues", props.minValues)
    .prop("maxValues", props.maxValues)
    .prop("fileTypes", props.fileTypes)
    .attr("required", props.required === undefined ? undefined : props.required ? "" : "false");
