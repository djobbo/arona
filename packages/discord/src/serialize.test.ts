import { describe, expect, it } from "vite-plus/test";
import { DiscordNode } from "./node";
import { buildModal, modalValues, serializeMessage } from "./serialize";

const node = (tag: string, id = tag) => new DiscordNode(tag, id);

const child = (parent: DiscordNode, tag: string, props: Record<string, unknown> = {}) => {
  const created = node(tag, `${parent.id}-${tag}-${parent.children.length}`);
  for (const [key, value] of Object.entries(props)) created.props[key] = value;
  parent.append(created);
  return created;
};

const appendText = (parent: DiscordNode, content: string) => {
  const created = new DiscordNode("#text", `${parent.id}-text-${parent.children.length}`, true);
  created.text = content;
  parent.append(created);
  return created;
};

describe("serializeMessage", () => {
  it("serializes text, separators and action rows", () => {
    const root = node("#root");
    const container = child(root, "container", { accentColor: "Red" });
    const textNode = child(container, "text");
    appendText(textNode, "Hello");
    child(container, "separator", { divider: false, spacing: 2 });
    const row = child(container, "actionRow");
    const button = child(row, "button", { style: "Success" });
    button.customId = "open";
    appendText(button, "Open");

    const snapshot = serializeMessage(root);
    const payload = snapshot.components[0] as {
      type: number;
      accent_color: number;
      components: Array<Record<string, unknown>>;
    };

    expect(payload.type).toBe(17);
    expect(payload.accent_color).toBe(0xed4245);
    expect(payload.components[0]).toMatchObject({ type: 10, content: "Hello" });
    expect(payload.components[1]).toMatchObject({ type: 14, divider: false, spacing: 2 });
    expect(payload.components[2]).toMatchObject({
      type: 1,
      components: [{ type: 2, label: "Open", custom_id: "open" }],
    });
  });

  it("serializes explicit action rows", () => {
    const root = node("#root");
    const buttonRow = child(root, "actionRow");
    const button = child(buttonRow, "button", { style: "Primary" });
    button.customId = "b";
    appendText(button, "B");

    const selectRow = child(root, "actionRow");
    const select = child(selectRow, "select", { placeholder: "Pick" });
    select.customId = "s";
    const option = child(select, "option", { value: "a", label: "A" });

    const snapshot = serializeMessage(root);
    expect(snapshot.components).toHaveLength(2);
    expect(snapshot.components[0]).toMatchObject({
      type: 1,
      components: [{ type: 2, label: "B" }],
    });
    expect(snapshot.components[1]).toMatchObject({
      type: 1,
      components: [
        { type: 3, placeholder: "Pick", options: [{ label: "A", value: option.props.value }] },
      ],
    });
  });

  it("rejects implicit action rows and galleries", () => {
    const button = node("#root");
    const topButton = child(button, "button");
    expect(() => serializeMessage(button)).toThrow("ActionRow");

    const media = node("#root");
    child(media, "media", { url: "https://example.com/a.png" });
    expect(() => serializeMessage(media)).toThrow("Gallery");

    const canvas = node("#root");
    child(canvas, "canvas", { svg: "<svg />" });
    expect(() => serializeMessage(canvas)).toThrow("Gallery");

    const modalField = node("#root");
    child(modalField, "checkbox", { name: "x" });
    expect(() => serializeMessage(modalField)).toThrow("Modal");

    const thumbnail = node("#root");
    child(thumbnail, "thumbnail", { url: "https://example.com/t.png" });
    expect(() => serializeMessage(thumbnail)).toThrow("Section accessory");

    const section = node("#root");
    const withoutAccessory = child(section, "section");
    child(withoutAccessory, "text");
    expect(() => serializeMessage(section)).toThrow("accessory");

    expect(topButton).toBeDefined();
  });

  it("serializes media galleries and files", () => {
    const root = node("#root");
    const gallery = child(root, "gallery");
    child(gallery, "media", { url: "https://example.com/a.png", description: "A" });
    const file = child(root, "file", { file: Buffer.from("x"), name: "f.txt" });

    const snapshot = serializeMessage(root);
    expect(snapshot.components[0]).toMatchObject({
      type: 12,
      items: [{ media: { url: "https://example.com/a.png" }, description: "A" }],
    });
    expect(snapshot.components[1]).toMatchObject({
      type: 13,
      file: { url: "attachment://f.txt" },
    });
    expect(snapshot.files).toHaveLength(1);
    expect(file).toBeDefined();
  });

  it("renders canvas SVG as a PNG attachment inside a gallery", () => {
    const root = node("#root");
    const gallery = child(root, "gallery");
    child(gallery, "canvas", {
      svg: '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"><rect width="10" height="10" fill="red"/></svg>',
      width: 10,
      height: 10,
      name: "canvas.png",
    });

    const snapshot = serializeMessage(root);
    expect(snapshot.components[0]).toMatchObject({
      type: 12,
      items: [{ media: { url: "attachment://canvas.png" } }],
    });
    expect(snapshot.files).toHaveLength(1);
  });

  it("omits modal nodes from the message", () => {
    const root = node("#root");
    const modal = child(root, "modal", { title: "Edit" });
    child(modal, "textInput", { label: "Name", name: "name" });

    const snapshot = serializeMessage(root);
    expect(snapshot.components).toEqual([]);
  });
});

describe("buildModal", () => {
  it("builds text inputs and reads submitted values by name", () => {
    const modal = node("modal");
    modal.customId = "modal-1";
    modal.props.title = "Edit";
    const nameLabel = child(modal, "label", { label: "Name" });
    const input = child(nameLabel, "textInput", { name: "name" });
    input.customId = "input-1";
    const bioLabel = child(modal, "label", { label: "Bio" });
    child(bioLabel, "textInput", { name: "bio" }).customId = "input-2";

    const builder = buildModal(modal);
    const json = builder.toJSON();
    expect(json).toMatchObject({ custom_id: "modal-1", title: "Edit" });
    expect(json.components).toMatchObject([
      { type: 18, label: "Name", component: { type: 4, custom_id: "input-1" } },
      { type: 18, label: "Bio", component: { type: 4, custom_id: "input-2" } },
    ]);

    const values = modalValues(modal, {
      fields: {
        getTextInputValue: (customId: string) => (customId === "input-1" ? "Ada" : "Engineer"),
      },
    } as never);
    expect(values.values).toEqual({ name: "Ada", bio: "Engineer" });
  });

  it("omits an empty text input value", () => {
    const modal = node("modal");
    modal.props.title = "Search";
    const label = child(modal, "label", { label: "Search" });
    const input = child(label, "textInput", { name: "search", value: "", minLength: 1 });
    input.customId = "search-input";

    const json = buildModal(modal).toJSON();
    const component = (json.components?.[0] as { component?: { value?: string } } | undefined)
      ?.component;
    expect(component?.value).toBeUndefined();
    expect(component).toMatchObject({ custom_id: "search-input", min_length: 1 });
  });
});

describe("new select components", () => {
  it("serializes user, role, mentionable and channel selects", () => {
    const root = node("#root");
    const user = child(child(root, "actionRow"), "userSelect", {
      defaultUsers: ["user-1"],
      placeholder: "Pick a user",
    });
    user.customId = "user-select";
    const role = child(child(root, "actionRow"), "roleSelect", {
      defaultRoles: ["role-1"],
    });
    role.customId = "role-select";
    const mentionable = child(child(root, "actionRow"), "mentionableSelect", {
      defaultUsers: ["user-1"],
      defaultRoles: ["role-1"],
    });
    mentionable.customId = "mentionable-select";
    const channel = child(child(root, "actionRow"), "channelSelect", {
      defaultChannels: ["channel-1"],
      channelTypes: [0, 2],
    });
    channel.customId = "channel-select";

    const snapshot = serializeMessage(root);
    expect(snapshot.components[0]).toMatchObject({
      type: 1,
      components: [
        {
          type: 5,
          custom_id: "user-select",
          placeholder: "Pick a user",
          default_values: [{ id: "user-1", type: "user" }],
        },
      ],
    });
    expect(snapshot.components[1]).toMatchObject({
      type: 1,
      components: [{ type: 6, default_values: [{ id: "role-1", type: "role" }] }],
    });
    expect(snapshot.components[2]).toMatchObject({
      type: 1,
      components: [
        {
          type: 7,
          default_values: [
            { id: "user-1", type: "user" },
            { id: "role-1", type: "role" },
          ],
        },
      ],
    });
    expect(snapshot.components[3]).toMatchObject({
      type: 1,
      components: [
        {
          type: 8,
          default_values: [{ id: "channel-1", type: "channel" }],
          channel_types: [0, 2],
        },
      ],
    });
  });
});

describe("new modal components", () => {
  const modal = () => {
    const node = new DiscordNode("modal", "modal-new");
    node.customId = "modal-new";
    node.props.title = "Profile";
    return node;
  };

  it("builds labels, checkboxes, groups, radio groups, file uploads and text", () => {
    const root = modal();
    const text = child(root, "text");
    appendText(text, "Fill this in");

    const label = child(root, "label", { label: "Name", description: "Your name" });
    const name = child(label, "textInput", { name: "name" });
    name.customId = "name-input";

    const checkbox = child(child(root, "label", { label: "Subscribe" }), "checkbox", {
      name: "subscribe",
      defaultChecked: true,
    });
    checkbox.customId = "subscribe-input";

    const group = child(child(root, "label", { label: "Interests" }), "checkboxGroup", {
      name: "interests",
      minValues: 1,
      maxValues: 2,
    });
    group.customId = "interests-input";
    child(group, "option", { value: "a", label: "A", selected: true });
    child(group, "option", { value: "b", label: "B" });

    const radio = child(child(root, "label", { label: "Plan" }), "radioGroup", {
      name: "plan",
    });
    radio.customId = "plan-input";
    child(radio, "option", { value: "free", label: "Free" });
    child(radio, "option", { value: "pro", label: "Pro", selected: true });

    const upload = child(child(root, "label", { label: "Attachments" }), "fileUpload", {
      name: "attachments",
      minValues: 0,
      maxValues: 3,
      fileTypes: ["image", ".pdf"],
    });
    upload.customId = "attachments-input";

    const json = buildModal(root).toJSON();
    expect(json.components).toHaveLength(6);
    expect(json.components?.[0]).toMatchObject({
      type: 10,
      content: "Fill this in",
    });
    expect(json.components?.[1]).toMatchObject({
      type: 18,
      label: "Name",
      description: "Your name",
      component: { type: 4, custom_id: "name-input" },
    });
    expect(json.components?.[2]).toMatchObject({
      type: 18,
      label: "Subscribe",
      component: { type: 23, custom_id: "subscribe-input", default: true },
    });
    expect(json.components?.[3]).toMatchObject({
      type: 18,
      label: "Interests",
      component: {
        type: 22,
        custom_id: "interests-input",
        min_values: 1,
        max_values: 2,
        options: [
          { value: "a", label: "A", default: true },
          { value: "b", label: "B", default: false },
        ],
      },
    });
    expect(json.components?.[4]).toMatchObject({
      type: 18,
      label: "Plan",
      component: {
        type: 21,
        custom_id: "plan-input",
        options: [
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro", default: true },
        ],
      },
    });
    expect(json.components?.[5]).toMatchObject({
      type: 18,
      label: "Attachments",
      component: {
        type: 19,
        custom_id: "attachments-input",
        min_values: 0,
        max_values: 3,
        file_types: ["image", ".pdf"],
      },
    });
  });

  it("rejects modal fields outside labels", () => {
    const direct = modal();
    child(direct, "textInput", { name: "name" });
    expect(() => buildModal(direct)).toThrow("Label");

    const legacy = modal();
    const row = child(legacy, "actionRow");
    child(row, "textInput", { name: "name" });
    expect(() => buildModal(legacy)).toThrow("Label");
  });

  it("reads every submitted field type", () => {
    const root = modal();
    const label = child(root, "label", { label: "Name" });
    child(label, "textInput", { name: "name" }).customId = "name-input";
    child(child(root, "label", { label: "Subscribe" }), "checkbox", {
      name: "subscribe",
    }).customId = "subscribe-input";
    const group = child(child(root, "label", { label: "Interests" }), "checkboxGroup", {
      name: "interests",
    });
    group.customId = "interests-input";
    child(group, "option", { value: "a", label: "A" });
    const radio = child(child(root, "label", { label: "Plan" }), "radioGroup", {
      name: "plan",
    });
    radio.customId = "plan-input";
    child(radio, "option", { value: "pro", label: "Pro" });
    child(child(root, "label", { label: "Reviewers" }), "userSelect", {
      name: "reviewers",
    }).customId = "reviewers-input";
    child(child(root, "label", { label: "Mentionables" }), "mentionableSelect", {
      name: "mentionables",
    }).customId = "mentionables-input";
    child(child(root, "label", { label: "Attachments" }), "fileUpload", {
      name: "attachments",
    }).customId = "attachments-input";

    const values = modalValues(root, {
      fields: {
        getTextInputValue: () => "Ada",
        getCheckbox: () => true,
        getCheckboxGroup: () => ["a", "b"],
        getRadioGroup: () => "pro",
        getSelectedUsers: () => new Map([["user-1", {}]]),
        getSelectedMentions: () => undefined,
        getSelectedMentionables: () => ({
          users: new Map([["user-2", {}]]),
          members: new Map([["member-2", {}]]),
          roles: new Map([["role-2", {}]]),
        }),
        getUploadedFiles: () => new Map([["file-1", { id: "file-1", name: "a.png" }]]),
      },
    } as never);

    expect(values.values).toEqual({ name: "Ada" });
    expect(values.checkboxes).toEqual({ subscribe: true });
    expect(values.selections).toEqual({
      interests: ["a", "b"],
      reviewers: ["user-1"],
    });
    expect(values.radioGroups).toEqual({ plan: "pro" });
    expect(values.mentionables).toEqual({
      mentionables: {
        users: ["user-2"],
        members: ["member-2"],
        roles: ["role-2"],
      },
    });
    expect(values.files.attachments?.[0]).toMatchObject({ id: "file-1" });
  });
});
