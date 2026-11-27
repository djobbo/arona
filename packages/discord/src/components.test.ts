import { UiSchema } from "@effect/ui";
import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import {
  ActionRow,
  Canvas,
  Container,
  File,
  Gallery,
  Media,
  Modal,
  ChannelSelect,
  Checkbox,
  CheckboxGroup,
  CheckboxOption,
  FileUpload,
  Label,
  MentionableSelect,
  Option,
  RadioGroup,
  RadioOption,
  RoleSelect,
  Section,
  Select,
  Separator,
  Text,
  TextInput,
  Thumbnail,
  UserSelect,
} from "./components";
import { buildModal } from "./serialize";
import { mountMessage } from "./render";
import { FakeChannel, findComponent } from "./testing";
import * as Discord from "./vocabulary";

describe("Discord components", () => {
  it("renders select menus with options and dispatches changes", async () => {
    const Message = UiSchema.TaggedEnum({
      Picked: { value: Schema.String },
    });

    const App = Discord.component({
      name: "SelectApp",
      model: Schema.Struct({ picked: Schema.String }),
      message: Message,
    }).make({
      init: () => ({ picked: "none" }),
      update: { Picked: ($, message) => $.evolve({ picked: message.value }) },
      view: (h, model) =>
        Container(h, {
          children: [
            Text(h, `Picked ${model.picked}`),
            ActionRow(h, {
              children: [
                Select(h, {
                  placeholder: "Pick one",
                  onChange: (interaction) =>
                    Message.Picked({ value: interaction.values[0] ?? "none" }),
                  children: [
                    Option(h, { value: "a", label: "A" }),
                    Option(h, { value: "b", label: "B", selected: true }),
                  ],
                }),
              ],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), App, {});
    const select = findComponent(channel.sent[0], (component) => component.type === 3);
    expect(select).toMatchObject({
      placeholder: "Pick one",
      options: [
        { label: "A", value: "a", default: false },
        { label: "B", value: "b", default: true },
      ],
    });

    const customId = select?.custom_id;
    expect(typeof customId).toBe("string");
    const interaction = {
      customId,
      values: ["b"],
      replied: false,
      deferred: false,
      isButton: () => false,
      isStringSelectMenu: () => true,
      isAnySelectMenu: () => true,
      isModalSubmit: () => false,
      isRepliable: () => true,
      deferUpdate: async () => {},
    };
    await root.interactionListener(interaction as never);
    const text = findComponent(channel.edits[0], (component) => component.type === 10);
    expect(text?.content).toBe("Picked b");
    await root.unmount();
  });

  it("renders a modal with text inputs", async () => {
    const App = Discord.component({
      name: "ModalApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Text(h, "Message"),
            Modal(h, {
              title: "Edit",
              children: [
                Label(h, {
                  label: "Name",
                  children: [TextInput(h, { name: "name" })],
                }),
                Label(h, {
                  label: "Bio",
                  children: [TextInput(h, { name: "bio", style: "Paragraph" })],
                }),
              ],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), App, {});
    const modalNode = [...root.host.container.descendants()].find((node) => node.tag === "modal");
    expect(modalNode).toBeDefined();
    if (!modalNode) return;

    const modal = buildModal(modalNode).toJSON();
    expect(modal).toMatchObject({ title: "Edit" });
    expect(modal.components).toHaveLength(2);
    await root.unmount();
  });

  it("renders galleries, files and canvas images", async () => {
    const App = Discord.component({
      name: "MediaApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Gallery(h, {
              children: [
                Media(h, { url: "https://example.com/a.png", description: "A" }),
                Canvas(h, {
                  svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><circle cx="5" cy="5" r="5"/></svg>',
                  name: "canvas.png",
                }),
              ],
            }),
            File(h, { file: Buffer.from("data"), name: "file.txt" }),
          ],
        }),
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), App, {});
    const payload = channel.sent[0] as { files: unknown[] };
    expect(payload.files).toHaveLength(2);
    expect(findComponent(channel.sent[0], (component) => component.type === 12)).toBeDefined();
    expect(findComponent(channel.sent[0], (component) => component.type === 13)).toBeDefined();
  });

  it("renders separators and thumbnails", async () => {
    const App = Discord.component({
      name: "Decorations",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Separator(h, { divider: false, spacing: 1 }),
            Section(h, {
              accessory: Thumbnail(h, {
                url: "https://example.com/t.png",
                description: "T",
              }),
              children: [Text(h, "Thumbnail section")],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), App, {});
    expect(findComponent(channel.sent[0], (component) => component.type === 14)).toMatchObject({
      divider: false,
      spacing: 1,
    });
    expect(findComponent(channel.sent[0], (component) => component.type === 11)).toMatchObject({
      media: { url: "https://example.com/t.png" },
    });
  });
});

describe("new component helpers", () => {
  it("renders the auto-populated select variants", async () => {
    const App = Discord.component({
      name: "SelectsApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            ActionRow(h, {
              children: [UserSelect(h, { placeholder: "User", defaultUsers: ["u1"] })],
            }),
            ActionRow(h, { children: [RoleSelect(h, { defaultRoles: ["r1"] })] }),
            ActionRow(h, {
              children: [
                MentionableSelect(h, {
                  defaultRoles: ["r1"],
                  defaultUsers: ["u1"],
                }),
              ],
            }),
            ActionRow(h, {
              children: [
                ChannelSelect(h, {
                  channelTypes: [0, 2],
                  defaultChannels: ["c1"],
                }),
              ],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    await mountMessage(channel.asRef(), App, {});
    const payload = channel.sent[0] as {
      components: Array<{ components: Array<Record<string, unknown>> }>;
    };
    const selects = payload.components
      .flatMap((container) => container.components)
      .flatMap((component) => (Array.isArray(component.components) ? component.components : []));
    expect(selects.map((select) => select.type)).toEqual([5, 6, 7, 8]);
  });

  it("dispatches auto-populated select changes", async () => {
    const Message = UiSchema.TaggedEnum({
      Picked: { id: Schema.String },
    });

    const App = Discord.component({
      name: "UserSelectApp",
      model: Schema.Struct({ picked: Schema.String }),
      message: Message,
    }).make({
      init: () => ({ picked: "none" }),
      update: { Picked: ($, message) => $.evolve({ picked: message.id }) },
      view: (h, model) =>
        Container(h, {
          children: [
            Text(h, `Picked ${model.picked}`),
            ActionRow(h, {
              children: [
                UserSelect(h, {
                  onChange: (interaction) =>
                    Message.Picked({
                      id: interaction.users.firstKey() ?? "none",
                    }),
                }),
              ],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), App, {});
    const select = findComponent(channel.sent[0], (component) => component.type === 5);
    expect(select).toBeDefined();

    await root.interactionListener({
      customId: select?.custom_id,
      replied: false,
      deferred: false,
      isButton: () => false,
      isStringSelectMenu: () => false,
      isAnySelectMenu: () => true,
      isUserSelectMenu: () => true,
      isModalSubmit: () => false,
      isRepliable: () => true,
      deferUpdate: async () => {},
      users: Object.assign(new Map([["user-1", {}]]), {
        firstKey: () => "user-1",
      }),
    } as never);

    const text = findComponent(channel.edits[0], (component) => component.type === 10);
    expect(text?.content).toBe("Picked user-1");
    await root.unmount();
  });

  it("renders the new modal fields through the helpers", async () => {
    const App = Discord.component({
      name: "ModalFieldsApp",
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) =>
        Container(h, {
          children: [
            Modal(h, {
              title: "Profile",
              children: [
                Text(h, "Tell us about yourself"),
                Label(h, {
                  label: "Name",
                  children: [TextInput(h, { name: "name" })],
                }),
                Label(h, {
                  label: "Subscribe",
                  children: [Checkbox(h, { name: "subscribe" })],
                }),
                Label(h, {
                  label: "Interests",
                  children: [
                    CheckboxGroup(h, {
                      name: "interests",
                      children: [
                        CheckboxOption(h, { value: "a", label: "A" }),
                        CheckboxOption(h, { value: "b", label: "B" }),
                      ],
                    }),
                  ],
                }),
                Label(h, {
                  label: "Plan",
                  children: [
                    RadioGroup(h, {
                      name: "plan",
                      children: [
                        RadioOption(h, { value: "free", label: "Free" }),
                        RadioOption(h, {
                          value: "pro",
                          label: "Pro",
                          selected: true,
                        }),
                      ],
                    }),
                  ],
                }),
                Label(h, {
                  label: "Files",
                  children: [
                    FileUpload(h, {
                      name: "files",
                      fileTypes: ["image", ".pdf"],
                    }),
                  ],
                }),
              ],
            }),
          ],
        }),
    });

    const channel = new FakeChannel();
    const { root } = await mountMessage(channel.asRef(), App, {});
    const modalNode = [...root.host.container.descendants()].find((node) => node.tag === "modal");
    expect(modalNode).toBeDefined();
    if (!modalNode) return;

    const modal = buildModal(modalNode).toJSON();
    expect(modal.components?.map((component) => component.type)).toEqual([10, 18, 18, 18, 18, 18]);
    const labels = modal.components?.slice(1) as Array<{
      component: { type: number };
    }>;
    expect(labels.map((label) => label.component.type)).toEqual([4, 23, 22, 21, 19]);
    await root.unmount();
  });
});
