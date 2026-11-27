import type {
  ActionsBlock,
  Button,
  DividerBlock,
  KnownBlock,
  MrkdwnElement,
  PlainTextElement,
  SectionBlock,
  TextObject,
} from "@slack/types";
import { type BotNode } from "@arona/core";

const stringValue = (node: BotNode, name: string): string | undefined => {
  const found = node.props[name] ?? node.attrs[name];
  if (typeof found === "string") return found;
  if (typeof found === "number" || typeof found === "boolean") {
    return String(found);
  }
  return undefined;
};

const booleanValue = (node: BotNode, name: string): boolean | undefined => {
  const found = node.props[name] ?? node.attrs[name];
  if (found === undefined || found === null) return undefined;
  if (typeof found === "boolean") return found;
  return found !== "false";
};

const textOf = (node: BotNode): string => node.textContent();

/** The `action_id` Slack sends back for a button. */
export const actionIdOf = (node: BotNode): string =>
  stringValue(node, "actionId") ?? stringValue(node, "customId") ?? node.customId ?? node.id;

const plainText = (text: string): PlainTextElement => ({
  type: "plain_text",
  text,
  emoji: true,
});

const mrkdwn = (text: string): MrkdwnElement => ({
  type: "mrkdwn",
  text,
});

const textElement = (node: BotNode): PlainTextElement => ({
  ...plainText(textOf(node)),
  ...(booleanValue(node, "emoji") === false ? { emoji: false } : {}),
});

const markdownElement = (node: BotNode): MrkdwnElement => mrkdwn(textOf(node));

const serializeButton = (node: BotNode): Button => {
  const text = textOf(node);
  if (!text) {
    throw new Error(`Button ${node.id} must contain text`);
  }

  const actionId = actionIdOf(node);
  const style = stringValue(node, "style");
  const url = stringValue(node, "url");
  const value = stringValue(node, "value");
  const disabled = booleanValue(node, "disabled");

  return {
    type: "button",
    text: plainText(text),
    action_id: actionId,
    ...(style === "primary" || style === "danger" ? { style } : {}),
    ...(url ? { url } : {}),
    ...(value ? { value } : {}),
    ...(disabled !== undefined ? { disabled } : {}),
  };
};

const serializeSection = (node: BotNode): SectionBlock => {
  const textNodes = node.children.filter(
    (child) => child.tag === "text" || child.tag === "markdown",
  );
  if (textNodes.length === 0) {
    throw new Error(`Section ${node.id} must contain a Text or Markdown child`);
  }
  if (textNodes.length > 1) {
    throw new Error(`Section ${node.id} can contain only one Text or Markdown child`);
  }
  const textNode = textNodes[0]!;

  const text: TextObject =
    textNode.tag === "markdown" ? markdownElement(textNode) : textElement(textNode);
  const accessoryNodes = node.children.filter((child) => child.attrs.role === "accessory");
  if (accessoryNodes.length > 1) {
    throw new Error(`Section ${node.id} can contain only one accessory`);
  }
  const accessoryNode = accessoryNodes[0];
  if (accessoryNode && accessoryNode.tag !== "button") {
    throw new Error(`Section ${node.id} accessory must be a Button`);
  }
  const accessory = accessoryNode ? serializeButton(accessoryNode) : null;

  return {
    type: "section",
    block_id: node.id,
    text,
    ...(accessory ? { accessory } : {}),
  };
};

const serializeActions = (node: BotNode): ActionsBlock => {
  const elements = node.children
    .filter((child) => !child.isText)
    .map((child) => {
      if (child.tag !== "button") {
        throw new Error(`Actions ${node.id} can only contain Buttons`);
      }
      return serializeButton(child);
    });

  if (elements.length === 0) {
    throw new Error(`Actions ${node.id} must contain at least one Button`);
  }
  if (elements.length > 25) {
    throw new Error(`Actions ${node.id} can contain at most 25 elements`);
  }

  return {
    type: "actions",
    block_id: node.id,
    elements,
  };
};

const serializeDivider = (node: BotNode): DividerBlock => ({
  type: "divider",
  block_id: node.id,
});

/** Serializes a rendered Slack tree into Block Kit blocks. */
export const serializeBlocks = (root: BotNode): ReadonlyArray<KnownBlock> =>
  root.children.flatMap(serializeChild);

const serializeChild = (child: BotNode): ReadonlyArray<KnownBlock> => {
  switch (child.tag) {
    case "blocks":
      return child.children.flatMap(serializeChild);
    case "section":
      return [serializeSection(child)];
    case "actions":
      return [serializeActions(child)];
    case "divider":
      return [serializeDivider(child)];
    case "text":
    case "markdown":
      throw new Error(
        `${child.tag} must be inside a Section, not a ${child.parent?.tag ?? "root"}`,
      );
    case "button":
      throw new Error("button must be inside Actions or a Section accessory");
    default:
      if (child.isText) return [];
      throw new Error(`Unsupported Slack block: ${child.tag}`);
  }
};
