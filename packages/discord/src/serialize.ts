import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelSelectMenuBuilder,
  CheckboxBuilder,
  CheckboxGroupBuilder,
  ContainerBuilder,
  FileBuilder,
  FileUploadBuilder,
  LabelBuilder,
  MediaGalleryBuilder,
  MediaGalleryItemBuilder,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  RadioGroupBuilder,
  resolveColor,
  RoleSelectMenuBuilder,
  SectionBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  TextInputBuilder,
  TextInputStyle,
  ThumbnailBuilder,
  UserSelectMenuBuilder,
  type ModalSubmitInteraction,
} from "discord.js";
import { Resvg } from "@resvg/resvg-js";
import { EMPTY_STRING } from "./constants";
import type { Attachment } from "./components/helpers/create-attachment";
import { createAttachment } from "./components/helpers/create-attachment";
import type { DiscordNode } from "./node";
import type { MessageSnapshot, ModalSubmitValues } from "./types";

type Json = object;

const value = (node: DiscordNode, name: string): unknown => node.props[name] ?? node.attrs[name];

const stringValue = (node: DiscordNode, name: string): string | undefined => {
  const found = value(node, name);
  if (typeof found === "string") return found;
  if (typeof found === "number" || typeof found === "boolean") {
    return String(found);
  }
  return undefined;
};

const numberValue = (node: DiscordNode, name: string): number | undefined => {
  const found = value(node, name);
  if (found === undefined || found === null || found === "") return undefined;
  const parsed = Number(found);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const booleanValue = (node: DiscordNode, name: string): boolean | undefined => {
  const found = value(node, name);
  if (found === undefined || found === null) return undefined;
  if (typeof found === "boolean") return found;
  return found !== "false";
};

const arrayValue = (node: DiscordNode, name: string): ReadonlyArray<unknown> | undefined => {
  const found = value(node, name);
  return Array.isArray(found) ? found : undefined;
};

const stringArrayValue = (node: DiscordNode, name: string): ReadonlyArray<string> | undefined => {
  const found = arrayValue(node, name);
  if (!found) return undefined;
  return found.filter((item): item is string => typeof item === "string");
};

type InteractionButtonStyle = Exclude<ButtonStyle, ButtonStyle.Link | ButtonStyle.Premium>;

const buttonStyles: Record<string, InteractionButtonStyle> = {
  Primary: ButtonStyle.Primary,
  Secondary: ButtonStyle.Secondary,
  Success: ButtonStyle.Success,
  Danger: ButtonStyle.Danger,
};

const buttonStyle = (node: DiscordNode): InteractionButtonStyle => {
  const found = value(node, "style");
  if (typeof found === "number") return found as InteractionButtonStyle;
  if (typeof found === "string" && found in buttonStyles) {
    return buttonStyles[found] as InteractionButtonStyle;
  }
  return ButtonStyle.Secondary;
};

const textInputStyle = (node: DiscordNode): TextInputStyle => {
  const found = value(node, "style");
  if (found === "Paragraph" || found === TextInputStyle.Paragraph) {
    return TextInputStyle.Paragraph;
  }
  return TextInputStyle.Short;
};

const labelOf = (node: DiscordNode): string => node.textContent();

interface Emit {
  readonly files: AttachmentBuilder[];
}

const mediaItem = (node: DiscordNode, emit: Emit): Json | null => {
  const description = stringValue(node, "description");
  const spoiler = booleanValue(node, "spoiler");
  const url = stringValue(node, "url");

  if (url) {
    return new MediaGalleryItemBuilder({
      media: { url },
      ...(description ? { description } : {}),
      ...(spoiler !== undefined ? { spoiler } : {}),
    }).toJSON();
  }

  const file = value(node, "file") as Attachment | undefined;
  if (file) {
    const attachment = createAttachment(file, stringValue(node, "name"));
    emit.files.push(attachment.data);
    return new MediaGalleryItemBuilder({
      media: { url: attachment.url },
      ...(description ? { description } : {}),
      ...(spoiler !== undefined ? { spoiler } : {}),
    }).toJSON();
  }

  return null;
};

const thumbnailItem = (node: DiscordNode, emit: Emit): Json | null => {
  const description = stringValue(node, "description");
  const spoiler = booleanValue(node, "spoiler");
  const url = stringValue(node, "url");

  let mediaUrl = url;
  if (!mediaUrl) {
    const file = value(node, "file") as Attachment | undefined;
    if (!file) return null;
    const attachment = createAttachment(file, stringValue(node, "name"));
    emit.files.push(attachment.data);
    mediaUrl = attachment.url;
  }

  return new ThumbnailBuilder({
    media: { url: mediaUrl },
    ...(description ? { description } : {}),
    ...(spoiler !== undefined ? { spoiler } : {}),
  }).toJSON();
};

const canvasItem = (node: DiscordNode, emit: Emit): Json | null => {
  const svg = stringValue(node, "svg");
  if (!svg) return null;

  const width = numberValue(node, "width") ?? 800;
  const png = new Resvg(svg, {
    fitTo: { mode: "width", value: width },
    font: { loadSystemFonts: false },
  })
    .render()
    .asPng();
  const name = stringValue(node, "name") ?? `${node.id}.png`;
  const attachment = createAttachment(Buffer.from(png), name);
  emit.files.push(attachment.data);

  return new MediaGalleryItemBuilder({
    media: { url: attachment.url },
  }).toJSON();
};

const serializeButton = (node: DiscordNode): Json | null => {
  const label = stringValue(node, "label") ?? labelOf(node);
  const disabled = booleanValue(node, "disabled") ?? false;
  const emoji = value(node, "emoji");
  const customId = stringValue(node, "customId") ?? node.customId ?? node.id;

  const labelValue = label || (emoji === undefined ? EMPTY_STRING : undefined);
  const data = {
    customId,
    style: buttonStyle(node),
    ...(labelValue !== undefined ? { label: labelValue } : {}),
    ...(emoji !== undefined ? { emoji: emoji as never } : {}),
    disabled,
  };
  return new ButtonBuilder(data).toJSON();
};

const serializeLinkButton = (node: DiscordNode): Json | null => {
  const url = stringValue(node, "url");
  if (!url) return null;
  const label = stringValue(node, "label") ?? labelOf(node);

  return new ButtonBuilder({
    style: ButtonStyle.Link,
    url,
    label: label || EMPTY_STRING,
    disabled: booleanValue(node, "disabled") ?? false,
  }).toJSON();
};

const serializeOption = (node: DiscordNode): Json | null => {
  const optionValue = stringValue(node, "value");
  if (!optionValue) return null;
  const description = stringValue(node, "description");
  const emoji = value(node, "emoji");

  return new StringSelectMenuOptionBuilder({
    value: optionValue,
    label: stringValue(node, "label") ?? labelOf(node) ?? optionValue,
    default: booleanValue(node, "selected") ?? false,
    ...(description ? { description } : {}),
    ...(emoji !== undefined ? { emoji: emoji as never } : {}),
  }).toJSON();
};

interface SelectBaseData {
  readonly custom_id: string;
  readonly placeholder?: string;
  readonly min_values?: number;
  readonly max_values?: number;
  readonly disabled?: boolean;
  readonly required?: boolean;
}

const selectBaseData = (node: DiscordNode): SelectBaseData => {
  const placeholder = stringValue(node, "placeholder");
  const minValues = numberValue(node, "minValues");
  const maxValues = numberValue(node, "maxValues");
  const required = booleanValue(node, "required");

  return {
    custom_id: inputCustomId(node),
    ...(placeholder ? { placeholder } : {}),
    ...(minValues !== undefined ? { min_values: minValues } : {}),
    ...(maxValues !== undefined ? { max_values: maxValues } : {}),
    disabled: booleanValue(node, "disabled") ?? false,
    ...(required !== undefined ? { required } : {}),
  };
};

const defaultValues = (
  node: DiscordNode,
  kind: "user" | "role" | "channel",
): ReadonlyArray<{ id: string; type: string }> => {
  const explicit = arrayValue(node, "defaultValues");
  if (explicit) {
    return explicit.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const record = item as { id?: unknown; type?: unknown };
      if (
        typeof record.id !== "string" ||
        typeof record.type !== "string" ||
        record.type !== kind
      ) {
        return [];
      }
      return [{ id: record.id, type: record.type }];
    });
  }

  const prop =
    kind === "user" ? "defaultUsers" : kind === "role" ? "defaultRoles" : "defaultChannels";
  const ids = stringArrayValue(node, prop);
  if (!ids) return [];
  return ids.map((id) => ({ id, type: kind }));
};

const serializeStringSelect = (node: DiscordNode): Json | null => {
  const options = node.children
    .filter((child) => child.tag === "option")
    .map(serializeOption)
    .filter((option): option is Json => option !== null);

  if (options.length === 0) {
    console.warn(`Select ${node.id} has no options and was skipped.`);
    return null;
  }

  return new StringSelectMenuBuilder({
    ...selectBaseData(node),
    options: options as never,
  }).toJSON();
};

const serializeUserSelect = (node: DiscordNode): Json => {
  const values = defaultValues(node, "user");
  return new UserSelectMenuBuilder({
    ...selectBaseData(node),
    ...(values.length > 0 ? { default_values: values as never } : {}),
  }).toJSON();
};

const serializeRoleSelect = (node: DiscordNode): Json => {
  const values = defaultValues(node, "role");
  return new RoleSelectMenuBuilder({
    ...selectBaseData(node),
    ...(values.length > 0 ? { default_values: values as never } : {}),
  }).toJSON();
};

const serializeMentionableSelect = (node: DiscordNode): Json => {
  const values = [...defaultValues(node, "user"), ...defaultValues(node, "role")];
  return new MentionableSelectMenuBuilder({
    ...selectBaseData(node),
    ...(values.length > 0 ? { default_values: values as never } : {}),
  }).toJSON();
};

const serializeChannelSelect = (node: DiscordNode): Json => {
  const values = defaultValues(node, "channel");
  const channelTypes = arrayValue(node, "channelTypes");
  return new ChannelSelectMenuBuilder({
    ...selectBaseData(node),
    ...(values.length > 0 ? { default_values: values as never } : {}),
    ...(channelTypes ? { channel_types: channelTypes as never } : {}),
  }).toJSON();
};

const serializeSelectAny = (node: DiscordNode): Json | null => {
  switch (node.tag) {
    case "select":
      return serializeStringSelect(node);
    case "userSelect":
      return serializeUserSelect(node);
    case "roleSelect":
      return serializeRoleSelect(node);
    case "mentionableSelect":
      return serializeMentionableSelect(node);
    case "channelSelect":
      return serializeChannelSelect(node);
    default:
      return null;
  }
};

const serializeAction = (node: DiscordNode): Json | null => {
  switch (node.tag) {
    case "button":
      return serializeButton(node);
    case "linkButton":
      return serializeLinkButton(node);
    case "select":
    case "userSelect":
    case "roleSelect":
    case "mentionableSelect":
    case "channelSelect":
      return serializeSelectAny(node);
    default:
      return null;
  }
};

const serializeAccessory = (node: DiscordNode, emit: Emit): Json | null => {
  switch (node.tag) {
    case "button":
      return serializeButton(node);
    case "linkButton":
      return serializeLinkButton(node);
    case "thumbnail":
      return thumbnailItem(node, emit);
    default:
      return null;
  }
};

const serializeSection = (node: DiscordNode, emit: Emit): Json[] => {
  const textComponents = node.children
    .filter((child) => child.tag === "text")
    .map((child) => new TextDisplayBuilder({ content: labelOf(child) || EMPTY_STRING }).toJSON());

  const accessoryNode = node.children.find((child) => child.attrs.role === "accessory");
  const accessory = accessoryNode ? serializeAccessory(accessoryNode, emit) : null;

  if (!accessory) {
    throw new Error(`Section ${node.id} has no accessory`);
  }

  return [
    new SectionBuilder({
      components: (textComponents.length > 0
        ? textComponents
        : [new TextDisplayBuilder({ content: EMPTY_STRING }).toJSON()]) as never,
      accessory: accessory as never,
    }).toJSON(),
  ];
};

const actionSelectTags = new Set([
  "select",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
]);

const serializeActionRow = (node: DiscordNode): Json | null => {
  const selectCount = node.children.filter((child) => actionSelectTags.has(child.tag)).length;

  if (selectCount > 1 || (selectCount === 1 && node.children.length > 1)) {
    throw new Error(`Action row ${node.id} can contain one select menu and nothing else`);
  }

  const components = node.children
    .map(serializeAction)
    .filter((component): component is Json => component !== null);

  if (components.length === 0) return null;
  if (components.length > 5) {
    throw new Error(`Action row ${node.id} can contain at most 5 components`);
  }
  return new ActionRowBuilder({ components: components as never }).toJSON();
};

const serializeContainer = (node: DiscordNode, emit: Emit): Json | null => {
  const components = serializeTopLevelChildren(node.children, emit);
  if (components.length === 0) return null;

  const accentColor = stringValue(node, "accentColor");
  const spoiler = booleanValue(node, "spoiler");

  return new ContainerBuilder({
    components: components as never,
    ...(accentColor ? { accent_color: resolveColor(accentColor as never) } : {}),
    ...(spoiler !== undefined ? { spoiler } : {}),
  }).toJSON();
};

const serializeFile = (node: DiscordNode, emit: Emit): Json | null => {
  const file = value(node, "file") as Attachment | undefined;
  if (!file) {
    console.warn(`File ${node.id} has no file and was skipped.`);
    return null;
  }
  const attachment = createAttachment(file, stringValue(node, "name"));
  emit.files.push(attachment.data);
  const spoiler = booleanValue(node, "spoiler");

  return new FileBuilder({
    file: { url: attachment.url },
    ...(spoiler !== undefined ? { spoiler } : {}),
  }).toJSON();
};

const serializeGallery = (node: DiscordNode, emit: Emit): Json | null => {
  const items = node.children
    .map((child) => (child.tag === "canvas" ? canvasItem(child, emit) : mediaItem(child, emit)))
    .filter((item): item is Json => item !== null);

  if (items.length === 0) return null;
  return new MediaGalleryBuilder({ items: items as never }).toJSON();
};

const actionOnlyTags = new Set([
  "button",
  "linkButton",
  "select",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
]);

const galleryOnlyTags = new Set(["media", "canvas"]);

const modalOnlyTags = new Set([
  "label",
  "textInput",
  "checkbox",
  "checkboxGroup",
  "radioGroup",
  "fileUpload",
]);

const serializeTopLevelChildren = (nodes: ReadonlyArray<DiscordNode>, emit: Emit): Json[] => {
  const out: Json[] = [];

  for (const node of nodes) {
    switch (node.tag) {
      case "fragment": {
        out.push(...serializeTopLevelChildren(node.children, emit));
        break;
      }
      case "container": {
        const container = serializeContainer(node, emit);
        if (container) out.push(container);
        break;
      }
      case "text":
        out.push(
          new TextDisplayBuilder({
            content: labelOf(node) || EMPTY_STRING,
          }).toJSON(),
        );
        break;
      case "separator": {
        const spacing = numberValue(node, "spacing");
        out.push(
          new SeparatorBuilder({
            divider: booleanValue(node, "divider") ?? true,
            ...(spacing !== undefined ? { spacing: spacing as never } : {}),
          }).toJSON(),
        );
        break;
      }
      case "section":
        out.push(...serializeSection(node, emit));
        break;
      case "actionRow": {
        const row = serializeActionRow(node);
        if (row) out.push(row);
        break;
      }
      case "gallery": {
        const gallery = serializeGallery(node, emit);
        if (gallery) out.push(gallery);
        break;
      }
      case "thumbnail":
        throw new Error("thumbnail must be a Section accessory");
      case "file": {
        const file = serializeFile(node, emit);
        if (file) out.push(file);
        break;
      }
      case "modal":
        break;
      default:
        if (node.isText) break;
        if (actionOnlyTags.has(node.tag)) {
          throw new Error(
            `${node.tag} must be inside an ActionRow, not a ${node.parent?.tag ?? "root"}`,
          );
        }
        if (galleryOnlyTags.has(node.tag)) {
          throw new Error(
            `${node.tag} must be inside a Gallery, not a ${node.parent?.tag ?? "root"}`,
          );
        }
        if (modalOnlyTags.has(node.tag)) {
          throw new Error(`${node.tag} must be inside a Modal`);
        }
        out.push(...serializeTopLevelChildren(node.children, emit));
    }
  }

  return out;
};

/** Serializes a rendered tree into a Discord message payload. */
export const serializeMessage = (root: DiscordNode): MessageSnapshot => {
  const emit: Emit = { files: [] };
  const components = serializeTopLevelChildren(root.children, emit);
  return {
    components: components.length > 0 ? components : [],
    files: emit.files,
  };
};

const inputCustomId = (node: DiscordNode): string =>
  stringValue(node, "customId") ?? node.customId ?? node.id;

const fieldName = (node: DiscordNode): string => stringValue(node, "name") ?? inputCustomId(node);

const buildTextInput = (node: DiscordNode): TextInputBuilder => {
  const placeholder = stringValue(node, "placeholder");
  const minLength = numberValue(node, "minLength");
  const maxLength = numberValue(node, "maxLength");
  const value = stringValue(node, "value");

  return new TextInputBuilder({
    customId: inputCustomId(node),
    style: textInputStyle(node),
    required: booleanValue(node, "required") ?? false,
    ...(value ? { value } : {}),
    ...(placeholder ? { placeholder } : {}),
    ...(minLength !== undefined ? { min_length: minLength } : {}),
    ...(maxLength !== undefined ? { max_length: maxLength } : {}),
  });
};

const groupOptions = (node: DiscordNode) =>
  node.children
    .filter((child) => child.tag === "option")
    .map((child) => ({
      value: stringValue(child, "value") ?? "",
      label: stringValue(child, "label") ?? labelOf(child),
      ...(stringValue(child, "description")
        ? { description: stringValue(child, "description") as string }
        : {}),
      default: booleanValue(child, "selected") ?? false,
    }));

const buildCheckbox = (node: DiscordNode): CheckboxBuilder =>
  new CheckboxBuilder({
    custom_id: inputCustomId(node),
    default: booleanValue(node, "default") ?? booleanValue(node, "defaultChecked") ?? false,
  });

const buildCheckboxGroup = (node: DiscordNode): CheckboxGroupBuilder => {
  const minValues = numberValue(node, "minValues");
  const maxValues = numberValue(node, "maxValues");
  const required = booleanValue(node, "required");
  return new CheckboxGroupBuilder({
    custom_id: inputCustomId(node),
    options: groupOptions(node),
    ...(minValues !== undefined ? { min_values: minValues } : {}),
    ...(maxValues !== undefined ? { max_values: maxValues } : {}),
    ...(required !== undefined ? { required } : {}),
  });
};

const buildRadioGroup = (node: DiscordNode): RadioGroupBuilder => {
  const required = booleanValue(node, "required");
  return new RadioGroupBuilder({
    custom_id: inputCustomId(node),
    options: groupOptions(node),
    ...(required !== undefined ? { required } : {}),
  });
};

const buildFileUpload = (node: DiscordNode): FileUploadBuilder => {
  const minValues = numberValue(node, "minValues");
  const maxValues = numberValue(node, "maxValues");
  const required = booleanValue(node, "required");
  const fileTypes = arrayValue(node, "fileTypes");
  return new FileUploadBuilder({
    custom_id: inputCustomId(node),
    ...(minValues !== undefined ? { min_values: minValues } : {}),
    ...(maxValues !== undefined ? { max_values: maxValues } : {}),
    ...(fileTypes ? { file_types: fileTypes as never } : {}),
    ...(required !== undefined ? { required } : {}),
  });
};

const modalFieldTags = new Set([
  "textInput",
  "select",
  "userSelect",
  "roleSelect",
  "mentionableSelect",
  "channelSelect",
  "checkbox",
  "checkboxGroup",
  "radioGroup",
  "fileUpload",
]);

const isModalField = (node: DiscordNode): boolean => modalFieldTags.has(node.tag);

const buildModalField = (node: DiscordNode): Json => {
  switch (node.tag) {
    case "textInput":
      return buildTextInput(node);
    case "select":
    case "userSelect":
    case "roleSelect":
    case "mentionableSelect":
    case "channelSelect": {
      const select = serializeSelectAny(node);
      if (!select) throw new Error(`Invalid select field ${node.id}`);
      return select;
    }
    case "checkbox":
      return buildCheckbox(node);
    case "checkboxGroup":
      return buildCheckboxGroup(node);
    case "radioGroup":
      return buildRadioGroup(node);
    case "fileUpload":
      return buildFileUpload(node);
    default:
      throw new Error(`Unsupported modal field ${node.tag}`);
  }
};

const buildLabel = (labelNode: DiscordNode, field: DiscordNode): LabelBuilder => {
  const label = stringValue(labelNode, "label");
  if (!label) {
    throw new Error(`Label ${labelNode.id} has no label text`);
  }
  const description = stringValue(labelNode, "description");
  return new LabelBuilder({
    label,
    ...(description ? { description } : {}),
    component: buildModalField(field) as never,
  });
};

/** Builds the modal a `modal` node describes. */
export const buildModal = (node: DiscordNode): ModalBuilder => {
  const modal = new ModalBuilder({
    customId: stringValue(node, "customId") ?? node.customId ?? node.id,
    title: stringValue(node, "title") ?? "Modal",
  });

  let labelCount = 0;
  const addLabel = (label: LabelBuilder) => {
    if (++labelCount > 5) {
      throw new Error(`Modal ${node.id} can contain at most 5 labels`);
    }
    modal.addLabelComponents(label);
  };

  for (const child of node.children) {
    if (child.tag === "text") {
      modal.addTextDisplayComponents(
        new TextDisplayBuilder({ content: labelOf(child) || EMPTY_STRING }),
      );
      continue;
    }

    if (child.tag === "label") {
      const fields = child.children.filter(isModalField);
      if (fields.length !== 1) {
        throw new Error(`Label ${child.id} must contain exactly one modal field`);
      }
      const field = fields[0];
      if (field) addLabel(buildLabel(child, field));
      continue;
    }

    if (isModalField(child)) {
      throw new Error(`${child.tag} must be inside a Label, not directly in a Modal`);
    }

    throw new Error(`Unsupported modal child ${child.tag}; use Text or Label`);
  }

  return modal;
};

const collectModalFields = (node: DiscordNode): DiscordNode[] => {
  const fields: DiscordNode[] = [];
  for (const child of node.children) {
    if (child.tag === "label") {
      fields.push(...child.children.filter(isModalField));
    }
  }
  return fields;
};

const collectionKeys = (
  collection: { keys(): IterableIterator<string> } | null | undefined,
): string[] => (collection ? [...collection.keys()] : []);

/** Reads the submitted values of a modal by the names its fields declared. */
export const modalValues = (
  node: DiscordNode,
  interaction: ModalSubmitInteraction,
): ModalSubmitValues => {
  const values: Record<string, string> = {};
  const selections: Record<string, ReadonlyArray<string>> = {};
  const mentionables: Record<
    string,
    {
      users: ReadonlyArray<string>;
      members: ReadonlyArray<string>;
      roles: ReadonlyArray<string>;
    }
  > = {};
  const checkboxes: Record<string, boolean> = {};
  const radioGroups: Record<string, string> = {};
  const files: Record<string, ReadonlyArray<import("discord.js").Attachment>> = {};

  for (const field of collectModalFields(node)) {
    const key = fieldName(field);
    const customId = inputCustomId(field);

    switch (field.tag) {
      case "textInput":
        values[key] = interaction.fields.getTextInputValue(customId);
        break;
      case "select":
        selections[key] = interaction.fields.getStringSelectValues(customId);
        break;
      case "userSelect":
        selections[key] = collectionKeys(interaction.fields.getSelectedUsers(customId, false));
        break;
      case "roleSelect":
        selections[key] = collectionKeys(interaction.fields.getSelectedRoles(customId, false));
        break;
      case "channelSelect":
        selections[key] = collectionKeys(interaction.fields.getSelectedChannels(customId, false));
        break;
      case "mentionableSelect": {
        const selected = interaction.fields.getSelectedMentionables(customId, false);
        mentionables[key] = {
          users: collectionKeys(selected?.users),
          members: collectionKeys(selected?.members),
          roles: collectionKeys(selected?.roles),
        };
        break;
      }
      case "checkbox":
        checkboxes[key] = interaction.fields.getCheckbox(customId);
        break;
      case "checkboxGroup":
        selections[key] = interaction.fields.getCheckboxGroup(customId);
        break;
      case "radioGroup":
        radioGroups[key] = interaction.fields.getRadioGroup(customId, false) ?? "";
        break;
      case "fileUpload": {
        const uploaded = interaction.fields.getUploadedFiles(customId, false);
        files[key] = uploaded ? [...uploaded.values()] : [];
        break;
      }
    }
  }

  return { values, selections, mentionables, checkboxes, radioGroups, files };
};

/** Collects every modal in a rendered tree. */
export const collectModals = (root: DiscordNode): DiscordNode[] => {
  const out: DiscordNode[] = [];
  for (const node of root.descendants()) {
    if (node.tag === "modal") out.push(node);
  }
  return out;
};
