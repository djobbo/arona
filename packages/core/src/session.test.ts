import { Cause, Effect, Option } from "effect";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vite-plus/test";
import {
  MessageSessionStore,
  type MessageSession,
  type MessageSessionStoreShape,
  encodeInteractionId,
  layerFile,
  layerMemory,
  makeSessionId,
  parseInteractionId,
} from "./session";

const session = (id: string): MessageSession => ({
  id,
  version: 0,
  status: "active",
  component: "Counter",
  build: "test",
  props: { message: "hello" },
  state: undefined,
  ephemeral: false,
  createdAt: 1,
  updatedAt: 1,
});

const exercise = (store: MessageSessionStoreShape) =>
  Effect.gen(function* () {
    const id = makeSessionId();
    yield* store.create(session(id));

    const found = yield* store.get(id);
    expect(Option.isSome(found)).toBe(true);

    const updated = yield* store.update(id, 0, (current) => ({
      ...current,
      status: "active",
      props: { message: "updated" },
    }));
    expect(updated.version).toBe(1);
    expect(updated.props).toEqual({ message: "updated" });

    const conflict = yield* Effect.exit(
      store.update(id, 0, (current) => ({ ...current, props: { message: "stale" } })),
    );
    expect(conflict._tag).toBe("Failure");
    if (conflict._tag === "Failure") {
      expect(Option.getOrUndefined(Cause.findErrorOption(conflict.cause))).toMatchObject({
        _tag: "SessionConflict",
      });
    }

    const withState = yield* store.setState(id, 1, { "/Counter": { count: 1 } });
    expect(withState.version).toBe(1);
    expect(withState.state).toEqual({ "/Counter": { count: 1 } });

    const attached = yield* store.attachMessage(id, {
      id: "message-1",
      channelId: "channel-1",
    });
    expect(attached.version).toBe(1);
    expect(attached.message?.id).toBe("message-1");

    const byMessage = yield* store.findByMessage("message-1");
    expect(Option.getOrUndefined(byMessage)).toBe(id);

    const active = yield* store.listActive();
    expect(active.map((entry) => entry.id)).toEqual([id]);

    yield* store.close(id);
    const closed = yield* store.get(id);
    expect(Option.getOrUndefined(closed)?.status).toBe("closed");

    const removed = yield* store.sweep(Date.now());
    expect(removed).toBe(1);
    const gone = yield* store.get(id);
    expect(Option.isNone(gone)).toBe(true);
  });

const inMemory = <A, E>(program: Effect.Effect<A, E, MessageSessionStore>) =>
  Effect.runPromise(program.pipe(Effect.provide(layerMemory)));

const inFile = <A, E>(directory: string, program: Effect.Effect<A, E, MessageSessionStore>) =>
  Effect.runPromise(program.pipe(Effect.provide(layerFile(directory))));

describe("MessageSessionStore", () => {
  it("supports the lifecycle in memory", async () => {
    await inMemory(
      Effect.gen(function* () {
        yield* exercise(yield* MessageSessionStore);
      }),
    );
  });

  it("supports the lifecycle in a file", async () => {
    const directory = await mkdtemp(join(tmpdir(), "arona-sessions-"));
    try {
      await inFile(
        directory,
        Effect.gen(function* () {
          yield* exercise(yield* MessageSessionStore);
        }),
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects a stale update", async () => {
    await inMemory(
      Effect.gen(function* () {
        const store = yield* MessageSessionStore;
        const id = makeSessionId();
        yield* store.create(session(id));
        yield* store.update(id, 0, (current) => current);
        const result = yield* Effect.exit(store.update(id, 0, (current) => current));
        expect(result._tag).toBe("Failure");
        if (result._tag === "Failure") {
          expect(Option.getOrUndefined(Cause.findErrorOption(result.cause))).toMatchObject({
            _tag: "SessionConflict",
            expected: 0,
            actual: 1,
          });
        }
      }),
    );
  });
});

describe("interaction ids", () => {
  it("round-trips the session, version and node key", () => {
    const id = makeSessionId();
    const encoded = encodeInteractionId(id, 12, "a3");
    expect(encoded.length).toBeLessThanOrEqual(100);
    expect(parseInteractionId(encoded)).toEqual({ sessionId: id, version: 12, key: "a3" });
  });

  it("keeps explicit custom ids as the key", () => {
    const parsed = parseInteractionId(encodeInteractionId("abc123", 0, "my.button"));
    expect(parsed).toEqual({ sessionId: "abc123", version: 0, key: "my.button" });
  });

  it("ignores foreign ids", () => {
    expect(parseInteractionId("my.button")).toBeUndefined();
    expect(parseInteractionId("ar1.short.not-base36.key")).toBeUndefined();
    expect(parseInteractionId(undefined)).toBeUndefined();
  });
});
