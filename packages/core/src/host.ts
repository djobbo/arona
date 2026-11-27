import type { Renderer, View } from "@effect/ui";
import { BotNode } from "./node";
import { encodeInteractionId, MAX_INTERACTION_ID_LENGTH } from "./session";

/** The session an Arona host stamps onto its generated interaction ids. */
export interface HostSession {
  readonly id: string;
  readonly version: number;
}

export interface BotHostOptions {
  /** The vocabulary name this host renders, such as `discord` or `slack`. */
  readonly name: string;
  /** Prefix for generated ids. Tests can pass a deterministic value. */
  readonly prefix?: string;
  /** Tags that receive a generated interaction id when they are created. */
  readonly interactiveTags?: ReadonlySet<string>;
}

/**
 * Shared host operations for node-based bot platforms.
 *
 * The renderer only needs node mutation, events and a commit boundary. Each
 * platform supplies a commit implementation that serializes its tree.
 */
export class BotHost implements Renderer.Host<BotNode> {
  readonly container: BotNode;
  readonly elements: ReadonlyArray<string>;
  readonly controlled: ReadonlySet<string> = new Set();
  readonly runsMounts = true;
  /** The platform this host serializes for, such as `discord` or `slack`. */
  readonly platform: string;

  protected readonly prefix: string;
  readonly #interactiveTags: ReadonlySet<string>;
  #counter = 0;
  #session: HostSession | null = null;

  constructor(options: BotHostOptions) {
    this.platform = options.name;
    this.prefix = options.prefix ?? crypto.randomUUID().slice(0, 8);
    this.elements = [options.name];
    this.container = new BotNode("#root", `${this.prefix}-root`);
    this.#interactiveTags = options.interactiveTags ?? new Set();
  }

  protected nextId(): string {
    return `${this.prefix}-${++this.#counter}`;
  }

  /** The session whose id and version are stamped onto interaction ids. */
  get session(): HostSession | null {
    return this.#session;
  }

  /** Binds the host to a resumable message session. */
  setSession(session: HostSession | null): void {
    this.#session = session;
  }

  /** Advances the version used by the next commit. */
  setSessionVersion(version: number): void {
    if (this.#session !== null) this.#session = { ...this.#session, version };
  }

  /**
   * Assigns every interactive node its platform-facing custom id.
   *
   * Without a session the id keeps the old host-generated value. With one,
   * auto ids are document-order ordinals and explicit ids keep the author's
   * text as the key, both wrapped with the session and its current version.
   * A restored tree therefore produces the same ids as the state it shows.
   */
  prepareInteractionIds(): void {
    let ordinal = 0;
    for (const node of this.container.descendants()) {
      if (!this.#interactiveTags.has(node.tag)) continue;
      if (this.#session === null) {
        node.customId = node.explicitCustomId ?? node.id;
        continue;
      }
      const key = node.explicitCustomId ?? `a${ordinal++}`;
      const customId = encodeInteractionId(this.#session.id, this.#session.version, key);
      if (customId.length > MAX_INTERACTION_ID_LENGTH) {
        throw new Error(
          `Interaction id for <${node.tag}> is ${customId.length} characters; the limit is ${MAX_INTERACTION_ID_LENGTH}`,
        );
      }
      node.customId = customId;
    }
  }

  createElement(tag: string): BotNode {
    return new BotNode(tag, this.nextId());
  }

  createText(text: string): BotNode {
    const node = new BotNode("#text", this.nextId(), true);
    node.text = text;
    return node;
  }

  createContainer(): BotNode {
    return new BotNode("#container", this.nextId());
  }

  setText(node: BotNode, text: string): void {
    node.text = text;
  }

  setAttr(node: BotNode, name: string, value: string | undefined, _previous?: string): void {
    if (value === undefined) {
      delete node.attrs[name];
      if (name === "customId") {
        node.explicitCustomId = null;
        node.customId = null;
      }
      return;
    }
    node.attrs[name] = value;
    if (name === "customId") {
      node.explicitCustomId = value;
      node.customId = value;
    }
  }

  setProp(node: BotNode, name: string, value: unknown): void {
    if (value === undefined) {
      delete node.props[name];
      if (name === "customId") {
        node.explicitCustomId = null;
        node.customId = null;
      }
      return;
    }
    node.props[name] = value;
    if (name === "customId" && typeof value === "string") {
      node.explicitCustomId = value;
      node.customId = value;
    }
  }

  insertBefore(parent: BotNode, node: BotNode, ref: BotNode | undefined): void {
    parent.insertBefore(node, ref);
  }

  remove(node: BotNode): void {
    node.detach();
  }

  parentOf(node: BotNode): BotNode | undefined {
    return node.parent ?? undefined;
  }

  nextOf(node: BotNode): BotNode | undefined {
    const parent = node.parent;
    if (!parent) return undefined;
    const index = parent.children.indexOf(node);
    return parent.children[index + 1];
  }

  setEvents(
    node: BotNode,
    handlers: Readonly<Record<string, View.Handler<unknown, any>>>,
    dispatch: Renderer.Dispatch,
    options: Readonly<Record<string, View.EventOptions>>,
  ): void {
    node.handlers = handlers;
    node.dispatch = dispatch;
    node.eventOptions = options;
  }
}
