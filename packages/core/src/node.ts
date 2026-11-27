import type { View } from "@effect/ui";
import type { Renderer } from "@effect/ui";

/**
 * A platform-neutral node in a rendered bot tree.
 *
 * Discord and Slack both use mutable trees that the renderer owns. Keeping the
 * shape here means both hosts share the same node semantics and the same
 * interaction bookkeeping.
 */
export class BotNode {
  readonly tag: string;
  readonly isText: boolean;
  text = "";
  parent: BotNode | null = null;
  children: BotNode[] = [];
  attrs: Record<string, string> = {};
  props: Record<string, unknown> = {};
  handlers: Readonly<Record<string, View.Handler<unknown, any>>> = {};
  eventOptions: Readonly<Record<string, View.EventOptions>> = {};
  dispatch: Renderer.Dispatch | null = null;

  /** The host-generated id, used for default block/action ids. */
  id: string;
  /** The author's custom id, before Arona wraps it for a session. */
  explicitCustomId: string | null = null;
  /** The id the platform sends back on an interaction. */
  customId: string | null = null;
  /** A platform-specific modal already shown for this node. */
  modalShown = false;

  constructor(tag: string, id: string, isText = false) {
    this.tag = tag;
    this.id = id;
    this.isText = isText;
  }

  append(node: BotNode): void {
    node.detach();
    node.parent = this;
    this.children.push(node);
  }

  insertBefore(node: BotNode, anchor?: BotNode): void {
    node.detach();
    node.parent = this;
    if (!anchor) {
      this.children.push(node);
      return;
    }
    const index = this.children.indexOf(anchor);
    if (index < 0) this.children.push(node);
    else this.children.splice(index, 0, node);
  }

  detach(): void {
    if (!this.parent) return;
    const index = this.parent.children.indexOf(this);
    if (index >= 0) this.parent.children.splice(index, 1);
    this.parent = null;
  }

  remove(node: BotNode): void {
    const index = this.children.indexOf(node);
    if (index >= 0) this.children.splice(index, 1);
    node.parent = null;
  }

  /** The text of this node and its text children. */
  textContent(): string {
    if (this.isText) return this.text;
    return this.children.map((child) => child.textContent()).join("");
  }

  *descendants(): Generator<BotNode> {
    yield this;
    for (const child of this.children) yield* child.descendants();
  }
}
