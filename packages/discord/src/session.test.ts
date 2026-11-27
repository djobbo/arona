import {
  layerMemory,
  MessageSessionStore,
  type MessageSession,
  type MessageSessionStoreShape,
} from "@arona/core";
import { UiSchema } from "@effect/ui";
import { Effect, Option, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { ActionRow, Button, Container, Text } from "./components";
import { AronaDiscordClient } from "./client";
import { mountSessionMessage } from "./render";
import { FakeChannel, fakeButtonInteraction, findButtonCustomId, findComponent } from "./testing";
import * as Discord from "./vocabulary";

const CounterMessage = UiSchema.TaggedEnum({ ClickedIncrement: {} });

const Counter = Discord.component({
  name: "SessionCounter",
  model: Schema.Struct({ count: Schema.Number }),
  message: CounterMessage,
}).make({
  init: () => ({ count: 0 }),
  update: { ClickedIncrement: ($) => $.evolve({ count: (n) => n + 1 }) },
  view: (h, model) =>
    Container(h, {
      children: [
        Text(h, `# Step: ${model.count}`),
        ActionRow(h, {
          children: [
            Button(h, {
              style: "Primary",
              onClick: CounterMessage.ClickedIncrement(),
              children: ["+"],
            }),
          ],
        }),
      ],
    }),
});

const memoryStore = (): Promise<MessageSessionStoreShape> =>
  Effect.runPromise(
    Effect.gen(function* () {
      return yield* MessageSessionStore;
    }).pipe(Effect.provide(layerMemory)),
  );

const textOf = (payload: unknown): string | undefined =>
  findComponent(payload, (component) => component.type === 10)?.content as string | undefined;

const recordOf = async (store: MessageSessionStoreShape, id: string): Promise<MessageSession> => {
  const found = await Effect.runPromise(store.get(id));
  if (Option.isNone(found)) throw new Error(`Missing session ${id}`);
  return found.value;
};

const fakeMessage = (edits: unknown[]) => ({
  id: "message",
  channelId: "channel",
  edit: async (payload: unknown) => {
    edits.push(payload);
    return fakeMessage(edits);
  },
});

const fakeInteraction = (client: AronaDiscordClient, customId: string, message: unknown) => {
  const interaction = {
    customId,
    replied: false,
    deferred: false,
    client,
    message,
    isChatInputCommand: () => false,
    isButton: () => true,
    isAnySelectMenu: () => false,
    isModalSubmit: () => false,
    isAutocomplete: () => false,
    isRepliable: () => true,
    deferUpdate: async () => {
      interaction.deferred = true;
    },
  };
  return interaction;
};

describe("resumable messages", () => {
  it("persists state after mount and after each interaction", async () => {
    const store = await memoryStore();
    const channel = new FakeChannel();
    const { message, root, session } = await mountSessionMessage(
      channel.asRef(),
      Counter,
      {},
      { store, componentKey: "SessionCounter", sessionProps: {} },
    );

    expect(message.id).toBe("message");
    const initial = await recordOf(store, session.id);
    expect(initial.version).toBe(0);
    expect(initial.status).toBe("active");
    expect(initial.message?.id).toBe("message");
    expect(initial.state).toBeDefined();

    const customId = findButtonCustomId(channel.sent[0]);
    expect(customId).toBe(`ar1.${session.id}.0.a0`);

    await root.interactionListener(fakeButtonInteraction(customId) as never);
    expect(textOf(channel.edits[0])).toBe("# Step: 1");

    const updated = await recordOf(store, session.id);
    expect(updated.version).toBe(1);
    expect(updated.state).toBeDefined();

    await root.unmount();
  });

  it("resumes a message in a fresh mount and continues from its state", async () => {
    const store = await memoryStore();
    const channel = new FakeChannel();
    const first = await mountSessionMessage(
      channel.asRef(),
      Counter,
      {},
      {
        store,
        componentKey: "SessionCounter",
        sessionProps: {},
      },
    );

    const firstId = findButtonCustomId(channel.sent[0]);
    await first.root.interactionListener(fakeButtonInteraction(firstId) as never);
    expect(textOf(channel.edits[0])).toBe("# Step: 1");
    const record = await recordOf(store, first.session.id);
    await first.root.unmount();

    const edits: unknown[] = [];
    const resumed = await mountSessionMessage(
      channel.asRef(),
      Counter,
      {},
      {
        store,
        componentKey: "SessionCounter",
        session: record,
        resume: fakeMessage(edits) as never,
        skipInitial: true,
      },
    );

    expect(edits).toHaveLength(0);
    const resumedId = findButtonCustomId(channel.edits[0]);
    await resumed.root.interactionListener(fakeButtonInteraction(resumedId) as never);
    expect(textOf(edits[0])).toBe("# Step: 2");

    const after = await recordOf(store, record.id);
    expect(after.version).toBe(2);
    await resumed.root.unmount();
  });

  it("resumes from a restarted client and heals a stale interaction", async () => {
    const store = await memoryStore();
    const channel = new FakeChannel();
    const initial = await mountSessionMessage(
      channel.asRef(),
      Counter,
      {},
      {
        store,
        componentKey: "SessionCounter",
        sessionProps: {},
      },
    );
    const initialId = findButtonCustomId(channel.sent[0]);
    await initial.root.unmount();

    const makeClient = () =>
      new AronaDiscordClient({
        token: "token",
        clientId: "client",
        intents: [],
        sessions: store,
      }).registerComponent("SessionCounter", Counter as never);

    const firstClient = makeClient();
    const firstEdits: unknown[] = [];
    await firstClient.handleInteraction(
      fakeInteraction(firstClient, initialId, fakeMessage(firstEdits)) as never,
    );
    expect(textOf(firstEdits[0])).toBe("# Step: 1");

    const afterFirst = await recordOf(store, initial.session.id);
    expect(afterFirst.version).toBe(1);
    await firstClient.destroy();

    const secondClient = makeClient();
    const secondEdits: unknown[] = [];
    const versionOneId = findButtonCustomId(firstEdits[0]);
    await secondClient.handleInteraction(
      fakeInteraction(secondClient, versionOneId, fakeMessage(secondEdits)) as never,
    );
    expect(textOf(secondEdits[0])).toBe("# Step: 2");

    const afterSecond = await recordOf(store, initial.session.id);
    expect(afterSecond.version).toBe(2);
    await secondClient.destroy();

    const healer = makeClient();
    const healedEdits: unknown[] = [];
    await healer.handleInteraction(
      fakeInteraction(healer, initialId, fakeMessage(healedEdits)) as never,
    );
    expect(textOf(healedEdits[0])).toBe("# Step: 2");

    const afterHeal = await recordOf(store, initial.session.id);
    expect(afterHeal.version).toBe(2);
    await healer.destroy();
  });
});
