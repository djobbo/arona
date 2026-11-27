import { UiSchema } from "@effect/ui";
import {
  ActionRow,
  Button,
  Checkbox,
  Container,
  Label,
  Modal,
  Option,
  RadioGroup,
  RadioOption,
  Section,
  Select,
  Separator,
  Text,
  TextInput,
} from "@arona/discord";
import * as Discord from "@arona/discord";
import type { Message } from "discord.js";
import { Schema } from "effect";

const AppMessage = UiSchema.TaggedEnum({
  ClickedIncrement: {},
  ClickedOpenModal: {},
  SubmittedModal: {
    value: Schema.String,
    newsletter: Schema.Boolean,
    plan: Schema.String,
  },
  ChangedSelection: { values: Schema.Array(Schema.String) },
});

const AppProps = Schema.Struct({ message: Schema.Unknown });

export const App = Discord.component({
  name: "App",
  props: AppProps,
  model: Schema.Struct({
    count: Schema.Number,
    modalOpen: Schema.Boolean,
    selection: Schema.Array(Schema.String),
    submitted: Schema.String,
    newsletter: Schema.Boolean,
    plan: Schema.String,
  }),
  message: AppMessage,
}).make({
  init: () => ({
    count: 0,
    modalOpen: false,
    selection: [],
    submitted: "",
    newsletter: false,
    plan: "",
  }),
  update: {
    ClickedIncrement: ($) => $.evolve({ count: (count) => count + 1 }),
    ClickedOpenModal: ($) => $.evolve({ modalOpen: true }),
    SubmittedModal: ($, message) =>
      $.evolve({
        modalOpen: false,
        submitted: message.value,
        newsletter: message.newsletter,
        plan: message.plan,
      }),
    ChangedSelection: ($, message) => $.evolve({ selection: message.values }),
  },
  view: (h, model) => {
    const message = h.props.message as Message;

    return Container(h, {
      children: [
        Text(h, `-# Original Message: \`${message.content}\``),
        Section(h, {
          accessory: Button(h, {
            onClick: AppMessage.ClickedIncrement(),
            children: ["Add One"],
          }),
          children: [Text(h, `# Count \`${model.count}\``)],
        }),
        ActionRow(h, {
          children: [
            Select(h, {
              maxValues: 2,
              onChange: (interaction) =>
                AppMessage.ChangedSelection({ values: interaction.values }),
              children: [
                Option(h, { value: "1", label: "1" }),
                Option(h, { value: "2", label: "2" }),
                Option(h, { value: "3", label: "3", selected: true }),
              ],
            }),
          ],
        }),
        ActionRow(h, {
          children: [
            Button(h, {
              onClick: AppMessage.ClickedOpenModal(),
              children: ["Open Modal"],
            }),
          ],
        }),
        model.modalOpen
          ? Modal(h, {
              title: "test",
              onSubmit: (payload) =>
                AppMessage.SubmittedModal({
                  value: payload.values.test ?? "",
                  newsletter: payload.checkboxes.newsletter ?? false,
                  plan: payload.radioGroups.plan ?? "",
                }),
              children: [
                Text(h, "Fill the form"),
                Label(h, {
                  label: "Test field",
                  description: "A text input inside a label",
                  children: [TextInput(h, { name: "test" })],
                }),
                Label(h, {
                  label: "Subscribe to the newsletter",
                  children: [Checkbox(h, { name: "newsletter" })],
                }),
                Label(h, {
                  label: "Plan",
                  children: [
                    RadioGroup(h, {
                      name: "plan",
                      children: [
                        RadioOption(h, { value: "free", label: "Free" }),
                        RadioOption(h, { value: "pro", label: "Pro", selected: true }),
                      ],
                    }),
                  ],
                }),
              ],
            })
          : false,
        Separator(h),
        Text(h, `-# Updated At \`${new Date().toISOString()}\``),
        model.submitted
          ? Text(
              h,
              `Submitted: \`${model.submitted}\` (plan: \`${model.plan}\`, newsletter: \`${model.newsletter}\`)`,
            )
          : false,
        model.selection.length > 0 ? Text(h, `Selected: \`${model.selection.join(", ")}\``) : false,
      ],
    });
  },
});
