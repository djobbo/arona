import type { Renderer } from "@effect/ui";
import { Context, Data, Effect, Layer, Option, Ref } from "effect";
import { randomUUID } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

/** The prefix that marks an Arona interaction id. */
export const INTERACTION_ID_PREFIX = "ar1";
/** Discord rejects a `custom_id` longer than this. */
export const MAX_INTERACTION_ID_LENGTH = 100;

/** Where a resumed message lives on the platform. */
export interface SessionMessageRef {
  readonly id: string;
  readonly channelId?: string | undefined;
  readonly guildId?: string | undefined;
}

export type MessageSessionStatus = "pending" | "active" | "closed";

/**
 * Everything needed to rebuild one rendered message in another process.
 *
 * `state` is the encoded Effect UI model tree from `Root.snapshot`. `props`
 * is caller-encoded and must be serialisable when the store is durable.
 */
export interface MessageSession {
  readonly id: string;
  /** The state version the message on the platform shows. Bumped per interaction. */
  readonly version: number;
  readonly status: MessageSessionStatus;
  /** Registered component key, resolved by the platform integration. */
  readonly component: string;
  /** Application build fingerprint. Empty means "do not check". */
  readonly build: string;
  readonly props: unknown;
  readonly state: Renderer.State | undefined;
  readonly message?: SessionMessageRef | undefined;
  readonly ephemeral: boolean;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly expiresAt?: number | undefined;
  readonly lastInteractionId?: string | undefined;
}

/** The session pieces encoded in every generated interaction id. */
export interface InteractionIdParts {
  readonly sessionId: string;
  readonly version: number;
  /** The node's own key: an auto ordinal or the author's custom id. */
  readonly key: string;
}

/** A store could not complete an operation. */
export class SessionStoreError extends Data.TaggedError("SessionStoreError")<{
  readonly message: string;
  readonly cause?: unknown;
}> {}

/** A session id was not found. */
export class SessionNotFound extends Data.TaggedError("SessionNotFound")<{
  readonly id: string;
}> {}

/** The caller's expected version is not the stored version. */
export class SessionConflict extends Data.TaggedError("SessionConflict")<{
  readonly id: string;
  readonly expected: number;
  readonly actual: number;
}> {}

/** A new session reused an existing id. */
export class SessionAlreadyExists extends Data.TaggedError("SessionAlreadyExists")<{
  readonly id: string;
}> {}

/** The service shape of a message session store. */
export interface MessageSessionStoreShape {
  create(session: MessageSession): Effect.Effect<void, SessionStoreError | SessionAlreadyExists>;
  get(id: string): Effect.Effect<Option.Option<MessageSession>, SessionStoreError>;
  /**
   * Compares `expectedVersion`, applies `update`, bumps the version and
   * returns the stored record. The callback must not mutate the record.
   */
  update(
    id: string,
    expectedVersion: number,
    update: (session: MessageSession) => MessageSession,
  ): Effect.Effect<MessageSession, SessionStoreError | SessionNotFound | SessionConflict>;
  /** Stores the first state and marks the session active without bumping the version. */
  setState(
    id: string,
    expectedVersion: number,
    state: Renderer.State,
  ): Effect.Effect<MessageSession, SessionStoreError | SessionNotFound | SessionConflict>;
  /** Attaches the platform message without changing the interaction version. */
  attachMessage(
    id: string,
    message: SessionMessageRef,
  ): Effect.Effect<MessageSession, SessionStoreError | SessionNotFound | SessionConflict>;
  /** The session that owns a platform message, if one is known. */
  findByMessage(messageId: string): Effect.Effect<Option.Option<string>, SessionStoreError>;
  /** Marks a session closed. A later sweep removes it. */
  close(id: string): Effect.Effect<void, SessionStoreError | SessionNotFound | SessionConflict>;
  /** Removes closed and expired sessions. Returns how many were removed. */
  sweep(now: number): Effect.Effect<number, SessionStoreError>;
  /** Sessions a restart could resume eagerly. */
  listActive(): Effect.Effect<ReadonlyArray<MessageSession>, SessionStoreError>;
}

/** The session store service. */
export class MessageSessionStore extends Context.Service<
  MessageSessionStore,
  MessageSessionStoreShape
>()("@arona/core/MessageSessionStore") {}

/** A short, URL-safe id for one rendered message. */
export const makeSessionId = (): string =>
  randomUUID().replaceAll("-", "").slice(0, 16).toLowerCase();

/**
 * Builds the id Arona sends as a Discord `custom_id`.
 *
 * The session and version let a cold process find the record before it has
 * rendered anything. `key` stays the author's custom id, or `a<n>` for an
 * auto-assigned interactive node.
 */
export const encodeInteractionId = (sessionId: string, version: number, key: string): string =>
  `${INTERACTION_ID_PREFIX}.${sessionId}.${version.toString(36)}.${key}`;

const interactionIdPattern = /^ar1\.([A-Za-z0-9_-]+)\.([0-9a-z]+)\.(.+)$/s;

/** Reads an Arona interaction id, or `undefined` for a foreign id. */
export const parseInteractionId = (
  value: string | null | undefined,
): InteractionIdParts | undefined => {
  if (typeof value !== "string") return undefined;
  const match = interactionIdPattern.exec(value);
  if (!match) return undefined;
  const sessionId = match[1];
  const versionText = match[2];
  const key = match[3];
  if (sessionId === undefined || versionText === undefined || key === undefined) return undefined;
  const version = Number.parseInt(versionText, 36);
  if (!Number.isSafeInteger(version) || version < 0) return undefined;
  return { sessionId, version, key };
};

const expired = (session: MessageSession, now: number): boolean =>
  session.expiresAt !== undefined && session.expiresAt <= now;

const active = (session: MessageSession, now: number): boolean =>
  session.status !== "closed" && !expired(session, now);

const hasCode = (error: unknown, code: string): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === code;

const isMissing = (error: unknown): boolean => hasCode(error, "ENOENT");
const isExisting = (error: unknown): boolean => hasCode(error, "EEXIST");

const storeError = (message: string, cause: unknown): SessionStoreError =>
  new SessionStoreError({ message, cause });

/* -------------------------------------------------------------------------- */
/* Memory                                                                     */
/* -------------------------------------------------------------------------- */

type Outcome =
  | { readonly _tag: "ok"; readonly value: MessageSession }
  | { readonly _tag: "missing" }
  | { readonly _tag: "conflict"; readonly actual: number };

const memoryStore = (): Effect.Effect<MessageSessionStoreShape> =>
  Effect.gen(function* () {
    const ref = yield* Ref.make<ReadonlyMap<string, MessageSession>>(new Map());

    const write = (
      id: string,
      expectedVersion: number,
      update: (current: MessageSession) => MessageSession,
      bump: boolean,
    ): Effect.Effect<MessageSession, SessionNotFound | SessionConflict> =>
      Effect.gen(function* () {
        const outcome = yield* Ref.modify(
          ref,
          (sessions): readonly [Outcome, ReadonlyMap<string, MessageSession>] => {
            const current = sessions.get(id);
            if (current === undefined) return [{ _tag: "missing" }, sessions];
            if (current.version !== expectedVersion) {
              return [{ _tag: "conflict", actual: current.version }, sessions];
            }
            const next: MessageSession = {
              ...update(current),
              id,
              createdAt: current.createdAt,
              version: bump ? expectedVersion + 1 : expectedVersion,
              updatedAt: Date.now(),
            };
            return [{ _tag: "ok", value: next }, new Map(sessions).set(id, next)];
          },
        );
        switch (outcome._tag) {
          case "ok":
            return outcome.value;
          case "missing":
            return yield* Effect.fail(new SessionNotFound({ id }));
          case "conflict":
            return yield* Effect.fail(
              new SessionConflict({ id, expected: expectedVersion, actual: outcome.actual }),
            );
        }
      });

    return {
      create: (session) =>
        Ref.modify(ref, (sessions): readonly [boolean, ReadonlyMap<string, MessageSession>] => {
          if (sessions.has(session.id)) return [false, sessions];
          return [true, new Map(sessions).set(session.id, session)];
        }).pipe(
          Effect.flatMap((created) =>
            created ? Effect.void : Effect.fail(new SessionAlreadyExists({ id: session.id })),
          ),
        ),
      get: (id) =>
        Ref.get(ref).pipe(Effect.map((sessions) => Option.fromNullishOr(sessions.get(id)))),
      update: (id, expectedVersion, update) => write(id, expectedVersion, update, true),
      setState: (id, expectedVersion, state) =>
        write(id, expectedVersion, (current) => ({ ...current, status: "active", state }), false),
      attachMessage: (id, message) =>
        Ref.modify(
          ref,
          (
            sessions,
          ): readonly [Option.Option<MessageSession>, ReadonlyMap<string, MessageSession>] => {
            const current = sessions.get(id);
            if (current === undefined) return [Option.none(), sessions];
            const next: MessageSession = { ...current, message, updatedAt: Date.now() };
            return [Option.some(next), new Map(sessions).set(id, next)];
          },
        ).pipe(
          Effect.flatMap((next) =>
            Option.isNone(next)
              ? Effect.fail(new SessionNotFound({ id }))
              : Effect.succeed(next.value),
          ),
        ),
      findByMessage: (messageId) =>
        Ref.get(ref).pipe(
          Effect.map((sessions) => {
            for (const session of sessions.values()) {
              if (session.message?.id === messageId) return Option.some(session.id);
            }
            return Option.none();
          }),
        ),
      close: (id) =>
        Ref.get(ref).pipe(
          Effect.flatMap((sessions) => {
            const current = sessions.get(id);
            if (current === undefined) return Effect.fail(new SessionNotFound({ id }));
            return write(
              id,
              current.version,
              (session) => ({ ...session, status: "closed" }),
              true,
            ).pipe(Effect.asVoid);
          }),
        ),
      sweep: (now) =>
        Ref.modify(ref, (sessions): readonly [number, ReadonlyMap<string, MessageSession>] => {
          const kept = new Map<string, MessageSession>();
          let removed = 0;
          for (const [id, session] of sessions) {
            if (session.status === "closed" || expired(session, now)) removed++;
            else kept.set(id, session);
          }
          return [removed, kept];
        }),
      listActive: () =>
        Ref.get(ref).pipe(
          Effect.map((sessions) =>
            [...sessions.values()].filter((session) => active(session, Date.now())),
          ),
        ),
    };
  });

/* -------------------------------------------------------------------------- */
/* File                                                                       */
/* -------------------------------------------------------------------------- */

const FORMAT = 1;

interface StoredSession {
  readonly format: number;
  readonly session: MessageSession;
}

/**
 * A JSON-file store for local development and single-instance deployments.
 *
 * Each session is one file, written to a temporary name and renamed. CAS is
 * checked before the write, but this is not a multi-writer transaction:
 * use a real database when several processes share a directory.
 */
const fileStore = (directory: string): Effect.Effect<MessageSessionStoreShape, SessionStoreError> =>
  Effect.gen(function* () {
    const root = path.resolve(directory);
    yield* Effect.tryPromise({
      try: () => fs.mkdir(root, { recursive: true }),
      catch: (cause) => storeError(`Could not create session directory ${root}`, cause),
    });

    const fileOf = (id: string): string => path.join(root, `${encodeURIComponent(id)}.json`);

    const read = async (id: string): Promise<MessageSession | undefined> => {
      try {
        const text = await fs.readFile(fileOf(id), "utf8");
        const parsed = JSON.parse(text) as StoredSession;
        if (parsed.format !== FORMAT) {
          throw new Error(`Unsupported session store format ${String(parsed.format)}`);
        }
        return parsed.session;
      } catch (error) {
        if (isMissing(error)) return undefined;
        throw error;
      }
    };

    const bodyOf = (session: MessageSession): string =>
      JSON.stringify({ format: FORMAT, session } satisfies StoredSession, null, 2);

    const writeFile = async (session: MessageSession): Promise<void> => {
      const target = fileOf(session.id);
      const temporary = `${target}.${randomUUID()}.tmp`;
      await fs.writeFile(temporary, bodyOf(session), "utf8");
      await fs.rename(temporary, target);
    };

    const writeNew = async (session: MessageSession): Promise<void> => {
      await fs.writeFile(fileOf(session.id), bodyOf(session), { encoding: "utf8", flag: "wx" });
    };

    const io = <A>(message: string, run: () => Promise<A>): Effect.Effect<A, SessionStoreError> =>
      Effect.tryPromise({ try: run, catch: (cause) => storeError(message, cause) });

    const readOrFail = (id: string, message: string) =>
      io(message, () => read(id)).pipe(
        Effect.flatMap((session) =>
          session === undefined
            ? Effect.fail(storeError(message, new SessionNotFound({ id })))
            : Effect.succeed(session),
        ),
      );

    const mutate = (
      id: string,
      expectedVersion: number,
      update: (current: MessageSession) => MessageSession,
      bump: boolean,
    ): Effect.Effect<MessageSession, SessionStoreError | SessionNotFound | SessionConflict> =>
      Effect.gen(function* () {
        const current = yield* readOrFail(id, `Could not read session ${id}`);
        if (current.version !== expectedVersion) {
          return yield* Effect.fail(
            new SessionConflict({ id, expected: expectedVersion, actual: current.version }),
          );
        }
        const next: MessageSession = {
          ...update(current),
          id,
          createdAt: current.createdAt,
          version: bump ? expectedVersion + 1 : expectedVersion,
          updatedAt: Date.now(),
        };
        yield* io(`Could not write session ${id}`, () => writeFile(next));
        return next;
      });

    const all = (): Effect.Effect<ReadonlyArray<MessageSession>, SessionStoreError> =>
      io("Could not list session directory", () => fs.readdir(root)).pipe(
        Effect.flatMap((names) =>
          Effect.forEach(
            names.filter((name) => name.endsWith(".json")),
            (name) =>
              io(`Could not read session file ${name}`, async () => {
                const text = await fs.readFile(path.join(root, name), "utf8");
                const parsed = JSON.parse(text) as StoredSession;
                if (parsed.format !== FORMAT) {
                  throw new Error(`Unsupported session store format ${String(parsed.format)}`);
                }
                return parsed.session;
              }),
            { concurrency: 8 },
          ),
        ),
      );

    return {
      create: (session) =>
        Effect.tryPromise({
          try: () => writeNew(session),
          catch: (cause) =>
            isExisting(cause)
              ? new SessionAlreadyExists({ id: session.id })
              : storeError(`Could not create session ${session.id}`, cause),
        }),
      get: (id) =>
        io(`Could not read session ${id}`, () => read(id)).pipe(Effect.map(Option.fromNullishOr)),
      update: (id, expectedVersion, update) => mutate(id, expectedVersion, update, true),
      setState: (id, expectedVersion, state) =>
        mutate(id, expectedVersion, (current) => ({ ...current, status: "active", state }), false),
      attachMessage: (id, message) =>
        Effect.gen(function* () {
          const current = yield* readOrFail(id, `Could not read session ${id}`);
          return yield* mutate(id, current.version, (session) => ({ ...session, message }), false);
        }),
      findByMessage: (messageId) =>
        all().pipe(
          Effect.map((sessions) => {
            const found = sessions.find((session) => session.message?.id === messageId);
            return found === undefined ? Option.none() : Option.some(found.id);
          }),
        ),
      close: (id) =>
        Effect.gen(function* () {
          const current = yield* readOrFail(id, `Could not read session ${id}`);
          yield* mutate(id, current.version, (session) => ({ ...session, status: "closed" }), true);
        }),
      sweep: (now) =>
        all().pipe(
          Effect.flatMap((sessions) =>
            Effect.reduce(
              sessions,
              () => 0,
              (removed, session) =>
                session.status === "closed" || expired(session, now)
                  ? io(`Could not remove session ${session.id}`, () =>
                      fs.rm(fileOf(session.id), { force: true }),
                    ).pipe(Effect.as(removed + 1))
                  : Effect.succeed(removed),
            ),
          ),
        ),
      listActive: () =>
        all().pipe(
          Effect.map((sessions) => sessions.filter((session) => active(session, Date.now()))),
        ),
    };
  });

/* -------------------------------------------------------------------------- */
/* Layers                                                                     */
/* -------------------------------------------------------------------------- */

/** A per-process store, useful for tests and a single gateway. */
export const layerMemory: Layer.Layer<MessageSessionStore> = Layer.effect(
  MessageSessionStore,
  memoryStore(),
);

/** A directory of JSON session files. */
export const layerFile = (directory: string): Layer.Layer<MessageSessionStore, SessionStoreError> =>
  Layer.effect(MessageSessionStore, fileStore(directory));
