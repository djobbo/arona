import type { InteractionRef } from "./types";

export interface FakeMessage {
  id: string;
  edits: unknown[];
  reply: (payload: unknown) => Promise<unknown>;
  edit: (payload: unknown) => Promise<unknown>;
}

interface FakeClient {
  roots: unknown[];
  addRoot(root: unknown): unknown;
  removeInteractionListener(uuid: string): unknown;
}

/** A sendable channel that records payloads and returns a fake message. */
export class FakeChannel {
  readonly sent: unknown[] = [];
  readonly edits: unknown[] = [];
  readonly client: FakeClient = {
    roots: [],
    addRoot(root: unknown) {
      this.roots.push(root);
      return root;
    },
    removeInteractionListener(uuid: string) {
      this.roots = this.roots.filter((root) => (root as { uuid: string }).uuid !== uuid);
      return this;
    },
  };

  async send(payload: unknown): Promise<FakeMessage> {
    this.sent.push(payload);
    return this.#message();
  }

  #message(): FakeMessage {
    return {
      id: "message",
      edits: this.edits,
      reply: async (payload: unknown) => {
        this.sent.push(payload);
        return this.#message();
      },
      edit: async (payload: unknown) => {
        this.edits.push(payload);
        return this.#message();
      },
    };
  }

  asRef(): InteractionRef {
    return this as unknown as InteractionRef;
  }
}

export const findComponent = (
  payload: unknown,
  predicate: (component: Record<string, unknown>) => boolean,
): Record<string, unknown> | undefined => {
  if (!payload || typeof payload !== "object") return undefined;
  const record = payload as Record<string, unknown>;
  if (predicate(record)) return record;
  for (const key of ["components", "items"]) {
    const children = record[key];
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      const found = findComponent(child, predicate);
      if (found) return found;
    }
  }
  const accessory = record.accessory;
  if (accessory) {
    const found = findComponent(accessory, predicate);
    if (found) return found;
  }
  return undefined;
};

export const findButtonCustomId = (payload: unknown): string => {
  const button = findComponent(payload, (component) => component.type === 2);
  const customId = button?.custom_id;
  if (typeof customId !== "string") throw new Error("No button custom id");
  return customId;
};

export const fakeButtonInteraction = (customId: string) => {
  const deferred: unknown[] = [];
  const interaction = {
    customId,
    replied: false,
    deferred: false,
    deferredUpdates: deferred,
    isButton: () => true,
    isStringSelectMenu: () => false,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    isRepliable: () => true,
    deferUpdate: async () => {
      interaction.deferred = true;
      deferred.push(true);
    },
  };
  return interaction;
};
