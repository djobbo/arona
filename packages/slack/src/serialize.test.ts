import { BotNode } from "@arona/core";
import { describe, expect, it } from "vite-plus/test";
import { actionIdOf, serializeBlocks } from "./serialize";

const node = (tag: string, id = tag) => new BotNode(tag, id);

const textNode = (value: string) => {
  const leaf = new BotNode("#text", `text-${value}`, true);
  leaf.text = value;
  return leaf;
};

const content = (tag: "text" | "markdown", value: string, id: string = tag) => {
  const element = node(tag, id);
  element.append(textNode(value));
  return element;
};

const blocksWith = (...children: BotNode[]) => {
  const root = node("#root");
  const blocks = node("blocks");
  for (const child of children) blocks.append(child);
  root.append(blocks);
  return root;
};

describe("serializeBlocks", () => {
  it("serializes sections and flattens an explicit Blocks container", () => {
    const blocks = blocksWith(content("text", "Hello"), content("markdown", "*world*"));

    // Both content nodes are top-level and must be rejected outside a section.
    expect(() => serializeBlocks(blocks)).toThrow(/inside a Section/);

    const section = node("section", "section-1");
    section.append(content("text", "Hello", "text-1"));
    const markdown = node("section", "section-2");
    markdown.append(content("markdown", "*world*", "markdown-1"));

    expect(serializeBlocks(blocksWith(section, markdown))).toEqual([
      {
        type: "section",
        block_id: "section-1",
        text: { type: "plain_text", text: "Hello", emoji: true },
      },
      {
        type: "section",
        block_id: "section-2",
        text: { type: "mrkdwn", text: "*world*" },
      },
    ]);
  });

  it("serializes actions with generated action ids", () => {
    const actions = node("actions", "actions-1");
    const button = node("button", "button-1");
    button.customId = "button-1";
    button.append(textNode("+"));
    actions.append(button);

    expect(serializeBlocks(blocksWith(actions))).toEqual([
      {
        type: "actions",
        block_id: "actions-1",
        elements: [
          {
            type: "button",
            text: { type: "plain_text", text: "+", emoji: true },
            action_id: "button-1",
          },
        ],
      },
    ]);
  });

  it("uses an explicit action id and button options", () => {
    const actions = node("actions", "actions-1");
    const button = node("button", "button-1");
    button.props.actionId = "increment";
    button.props.style = "primary";
    button.props.value = "1";
    button.props.disabled = true;
    button.append(textNode("+"));
    actions.append(button);

    const [block] = serializeBlocks(blocksWith(actions));
    expect(block).toMatchObject({
      type: "actions",
      elements: [
        {
          type: "button",
          action_id: "increment",
          style: "primary",
          value: "1",
          disabled: true,
        },
      ],
    });
    expect(actionIdOf(button)).toBe("increment");
  });

  it("serializes a section accessory button", () => {
    const section = node("section", "section-1");
    section.append(content("text", "Body"));
    const accessory = node("button", "accessory");
    accessory.attrs.role = "accessory";
    accessory.append(textNode("Open"));
    section.append(accessory);

    expect(serializeBlocks(blocksWith(section))).toEqual([
      {
        type: "section",
        block_id: "section-1",
        text: { type: "plain_text", text: "Body", emoji: true },
        accessory: {
          type: "button",
          text: { type: "plain_text", text: "Open", emoji: true },
          action_id: "accessory",
        },
      },
    ]);
  });

  it("serializes dividers", () => {
    expect(serializeBlocks(blocksWith(node("divider", "divider-1")))).toEqual([
      { type: "divider", block_id: "divider-1" },
    ]);
  });

  it("rejects invalid block placement", () => {
    const root = node("#root");
    const button = node("button", "button-1");
    button.append(textNode("x"));
    root.append(button);

    expect(() => serializeBlocks(root)).toThrow(/inside Actions/);
  });

  it("rejects a section without text and actions without buttons", () => {
    const section = node("section", "section-1");
    expect(() => serializeBlocks(blocksWith(section))).toThrow(/Text or Markdown/);

    const actions = node("actions", "actions-1");
    expect(() => serializeBlocks(blocksWith(actions))).toThrow(/at least one Button/);
  });

  it("rejects unsupported section accessories and actions children", () => {
    const section = node("section", "section-1");
    section.append(content("text", "Body"));
    const accessory = node("divider", "not-a-button");
    accessory.attrs.role = "accessory";
    section.append(accessory);
    expect(() => serializeBlocks(blocksWith(section))).toThrow(/accessory must be a Button/);

    const actions = node("actions", "actions-1");
    actions.append(content("text", "not a button"));
    expect(() => serializeBlocks(blocksWith(actions))).toThrow(/only contain Buttons/);
  });

  it("rejects a section with more than one text child", () => {
    const section = node("section", "section-1");
    section.append(content("text", "one"));
    section.append(content("markdown", "two"));
    expect(() => serializeBlocks(blocksWith(section))).toThrow(/only one Text or Markdown/);
  });

  it("rejects buttons without text", () => {
    const actions = node("actions", "actions-1");
    actions.append(node("button", "empty"));
    expect(() => serializeBlocks(blocksWith(actions))).toThrow(/must contain text/);
  });
});
