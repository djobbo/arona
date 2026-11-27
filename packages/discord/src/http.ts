import type { Interaction } from "discord.js";
import { createPublicKey, verify } from "node:crypto";
import type { AronaDiscordClient } from "./client";
import { assertJsonPayload, DiscordRest, type DiscordPayload } from "./rest";

/** Discord interaction callback types used by the HTTP adapter. */
export const InteractionResponseType = {
  pong: 1,
  channelMessage: 4,
  deferredChannelMessage: 5,
  deferredUpdate: 6,
  updateMessage: 7,
  autocomplete: 8,
  modal: 9,
} as const;

export interface DiscordInteractionResponse {
  readonly type: number;
  readonly data?: unknown;
}

/** The raw JSON Discord POSTs to an interactions endpoint. */
export interface RawDiscordInteraction {
  readonly id: string;
  readonly application_id: string;
  readonly type: number;
  readonly token: string;
  readonly data?: any;
  readonly message?: any;
  readonly channel_id?: string | undefined;
  readonly guild_id?: string | undefined;
}

/** Ed25519 verification for Discord's interaction headers. */
export const verifyDiscordSignature = (options: {
  readonly publicKey: string;
  readonly signature: string;
  readonly timestamp: string;
  readonly body: string;
}): boolean => {
  try {
    // Discord gives the raw 32-byte key; Node wants an SPKI DER wrapper.
    const key = createPublicKey({
      key: Buffer.concat([
        Buffer.from("302a300506032b6570032100", "hex"),
        Buffer.from(options.publicKey, "hex"),
      ]),
      format: "der",
      type: "spki",
    });
    return verify(
      null,
      Buffer.from(options.timestamp + options.body),
      key,
      Buffer.from(options.signature, "hex"),
    );
  } catch {
    return false;
  }
};

const COMPONENT_BUTTON = 2;
const COMPONENT_STRING_SELECT = 3;
const COMPONENT_USER_SELECT = 5;
const COMPONENT_ROLE_SELECT = 6;
const COMPONENT_MENTIONABLE_SELECT = 7;
const COMPONENT_CHANNEL_SELECT = 8;
const SELECT_TYPES = new Set([
  COMPONENT_STRING_SELECT,
  COMPONENT_USER_SELECT,
  COMPONENT_ROLE_SELECT,
  COMPONENT_MENTIONABLE_SELECT,
  COMPONENT_CHANNEL_SELECT,
]);
const EPHEMERAL_FLAG = 1 << 6;

type MapOf<T> = Map<string, T>;

const mapOfIds = <T>(
  ids: ReadonlyArray<string>,
  values: Record<string, T> | undefined,
): MapOf<T> => {
  const out = new Map<string, T>();
  for (const id of ids) out.set(id, values?.[id] ?? ({ id } as T));
  return out;
};

interface RawComponent {
  readonly type: number;
  readonly custom_id?: string;
  readonly component?: RawComponent;
  readonly components?: ReadonlyArray<RawComponent>;
  readonly value?: unknown;
  readonly values?: ReadonlyArray<string>;
}

const componentMap = (root: ReadonlyArray<RawComponent>): Map<string, RawComponent> => {
  const out = new Map<string, RawComponent>();
  const visit = (components: ReadonlyArray<RawComponent>): void => {
    for (const component of components) {
      if (component.custom_id !== undefined) out.set(component.custom_id, component);
      if (component.component !== undefined) visit([component.component]);
      if (component.components !== undefined) visit(component.components);
    }
  };
  visit(root);
  return out;
};

/**
 * The modal fields a raw modal submit exposes, shaped like discord.js
 * `ModalSubmitFields` where the renderer reads them.
 */
export class RestModalFields {
  readonly #fields: Map<string, RawComponent>;
  readonly #resolved: Record<string, any> | undefined;

  constructor(data: {
    readonly components?: ReadonlyArray<RawComponent>;
    readonly resolved?: any;
  }) {
    this.#fields = componentMap(data.components ?? []);
    this.#resolved = data.resolved;
  }

  #field(customId: string): RawComponent | undefined {
    return this.#fields.get(customId);
  }

  getTextInputValue(customId: string): string {
    const value = this.#field(customId)?.value;
    return typeof value === "string" ? value : "";
  }

  getStringSelectValues(customId: string): ReadonlyArray<string> {
    return this.#field(customId)?.values ?? [];
  }

  getSelectedUsers(customId: string, _required?: boolean): MapOf<unknown> {
    const ids = this.#field(customId)?.values ?? [];
    return mapOfIds(ids, this.#resolved?.["users"]);
  }

  getSelectedRoles(customId: string, _required?: boolean): MapOf<unknown> {
    const ids = this.#field(customId)?.values ?? [];
    return mapOfIds(ids, this.#resolved?.["roles"]);
  }

  getSelectedChannels(customId: string, _required?: boolean): MapOf<unknown> {
    const ids = this.#field(customId)?.values ?? [];
    return mapOfIds(ids, this.#resolved?.["channels"]);
  }

  getSelectedMentionables(customId: string): {
    users: MapOf<unknown>;
    members: MapOf<unknown>;
    roles: MapOf<unknown>;
  } {
    const ids = this.#field(customId)?.values ?? [];
    const users = this.#resolved?.["users"] as Record<string, unknown> | undefined;
    const members = this.#resolved?.["members"] as Record<string, unknown> | undefined;
    const roles = this.#resolved?.["roles"] as Record<string, unknown> | undefined;
    return {
      users: mapOfIds(
        ids.filter((id) => users?.[id] !== undefined),
        users,
      ),
      members: mapOfIds(
        ids.filter((id) => members?.[id] !== undefined),
        members,
      ),
      roles: mapOfIds(
        ids.filter((id) => roles?.[id] !== undefined),
        roles,
      ),
    };
  }

  getCheckbox(customId: string): boolean {
    return this.#field(customId)?.value === true;
  }

  getCheckboxGroup(customId: string): ReadonlyArray<string> {
    return this.#field(customId)?.values ?? [];
  }

  getRadioGroup(customId: string, _required?: boolean): string | null {
    const value = this.#field(customId)?.value;
    return typeof value === "string" ? value : null;
  }

  getUploadedFiles(customId: string, _required?: boolean): MapOf<unknown> {
    const ids = this.#field(customId)?.values ?? [];
    return mapOfIds(ids, this.#resolved?.["attachments"]);
  }
}

interface RawOption {
  readonly name: string;
  readonly type: number;
  readonly value?: unknown;
  readonly options?: ReadonlyArray<RawOption>;
}

/**
 * Command options from a raw command interaction, shaped like
 * discord.js `CommandInteractionOptionResolver` for the getters Arona uses.
 */
export class RestOptions {
  readonly #options: Map<string, RawOption>;
  readonly #resolved: Record<string, any> | undefined;

  constructor(data: { readonly options?: ReadonlyArray<RawOption>; readonly resolved?: any }) {
    const options = new Map<string, RawOption>();
    const visit = (entries: ReadonlyArray<RawOption>): void => {
      for (const entry of entries) {
        options.set(entry.name, entry);
        if (entry.options !== undefined) visit(entry.options);
      }
    };
    visit(data.options ?? []);
    this.#options = options;
    this.#resolved = data.resolved;
  }

  get(name: string): RawOption | undefined {
    return this.#options.get(name);
  }

  getString(name: string): string | null {
    const value = this.get(name)?.value;
    return typeof value === "string" ? value : null;
  }

  getInteger(name: string): number | null {
    const value = this.get(name)?.value;
    return typeof value === "number" ? value : null;
  }

  getNumber(name: string): number | null {
    return this.getInteger(name);
  }

  getBoolean(name: string): boolean | null {
    const value = this.get(name)?.value;
    return typeof value === "boolean" ? value : null;
  }

  #resolvedValue(name: string, collection: string): unknown {
    const id = this.getString(name);
    return id === null ? null : (this.#resolved?.[collection]?.[id] ?? { id });
  }

  getUser(name: string): unknown {
    return this.#resolvedValue(name, "users");
  }

  getChannel(name: string): unknown {
    return this.#resolvedValue(name, "channels");
  }

  getRole(name: string): unknown {
    return this.#resolvedValue(name, "roles");
  }

  getMentionable(name: string): unknown {
    const id = this.getString(name);
    if (id === null) return null;
    return (
      this.#resolved?.["users"]?.[id] ??
      this.#resolved?.["members"]?.[id] ??
      this.#resolved?.["roles"]?.[id] ?? { id }
    );
  }

  getAttachment(name: string): unknown {
    return this.#resolvedValue(name, "attachments");
  }

  getSubcommand(_required?: boolean): string | null {
    for (const option of this.#options.values()) {
      if (option.type === 1) return option.name;
    }
    return null;
  }

  getSubcommandGroup(_required?: boolean): string | null {
    for (const option of this.#options.values()) {
      if (option.type === 2) return option.name;
    }
    return null;
  }
}

/** One message on the platform, as the HTTP adapter can edit it. */
export class RestMessage {
  readonly id: string;
  readonly channelId: string | undefined;
  readonly ephemeral: boolean;
  readonly #edit: (payload: DiscordPayload) => Promise<RestMessage>;

  constructor(options: {
    readonly id: string;
    readonly channelId?: string | undefined;
    readonly ephemeral: boolean;
    readonly edit: (payload: DiscordPayload) => Promise<RestMessage>;
  }) {
    this.id = options.id;
    this.channelId = options.channelId;
    this.ephemeral = options.ephemeral;
    this.#edit = options.edit;
  }

  edit(payload: DiscordPayload): Promise<RestMessage> {
    return this.#edit(payload);
  }
}

export interface RestInteractionOptions {
  readonly raw: RawDiscordInteraction;
  readonly client: AronaDiscordClient;
  readonly rest: DiscordRest;
  readonly mode: "inline" | "deferred";
  readonly respond: (response: DiscordInteractionResponse) => void;
  /** `true` when the HTTP handler already returned the initial response. */
  readonly initialResponseSent?: boolean | undefined;
}

/**
 * A discord.js-shaped interaction over a raw HTTP payload.
 *
 * The renderer's host only needs the members this class exposes; passing it to
 * `AronaDiscordClient.handleInteraction` makes the gateway and HTTP paths share
 * the same component/session code.
 */
export class RestInteraction {
  readonly #raw: RawDiscordInteraction;
  readonly #client: AronaDiscordClient;
  readonly #rest: DiscordRest;
  readonly #mode: "inline" | "deferred";
  readonly #respond: (response: DiscordInteractionResponse) => void;
  readonly #message: RestMessage | undefined;
  #responded: boolean;
  #replied = false;
  #deferred: boolean;
  #modal = false;

  constructor(options: RestInteractionOptions) {
    this.#raw = options.raw;
    this.#client = options.client;
    this.#rest = options.rest;
    this.#mode = options.mode;
    this.#respond = options.respond;
    this.#responded = options.initialResponseSent === true;
    this.#deferred = this.#responded && options.mode === "deferred";
    this.#message =
      options.raw.message === undefined
        ? undefined
        : new RestMessage({
            id: String(options.raw.message.id ?? ""),
            channelId: options.raw.message.channel_id ?? options.raw.channel_id ?? undefined,
            ephemeral: (Number(options.raw.message.flags ?? 0) & EPHEMERAL_FLAG) !== 0,
            edit: (payload) => this.#editMessage(payload, String(options.raw.message.id ?? "")),
          });
  }

  get raw(): RawDiscordInteraction {
    return this.#raw;
  }

  get id(): string {
    return this.#raw.id;
  }

  get applicationId(): string {
    return this.#raw.application_id;
  }

  get token(): string {
    return this.#raw.token;
  }

  get client(): AronaDiscordClient {
    return this.#client;
  }

  get commandName(): string | undefined {
    return this.#raw.type === 2 ? this.#raw.data?.name : undefined;
  }

  get customId(): string | undefined {
    return this.#raw.data?.custom_id;
  }

  get values(): ReadonlyArray<string> | undefined {
    return this.#raw.data?.values;
  }

  get message(): RestMessage | undefined {
    return this.#message;
  }

  get replied(): boolean {
    return this.#replied;
  }

  get deferred(): boolean {
    return this.#deferred;
  }

  get fields(): RestModalFields {
    return new RestModalFields(this.#raw.data ?? {});
  }

  get options(): RestOptions {
    return new RestOptions(this.#raw.data ?? {});
  }

  isButton(): boolean {
    return this.#raw.type === 3 && this.#raw.data?.component_type === COMPONENT_BUTTON;
  }

  isAnySelectMenu(): boolean {
    return (
      this.#raw.type === 3 &&
      SELECT_TYPES.has(Number(this.#raw.data?.component_type)) &&
      this.#raw.data?.component_type !== COMPONENT_BUTTON
    );
  }

  isModalSubmit(): boolean {
    return this.#raw.type === 5;
  }

  isChatInputCommand(): boolean {
    return this.#raw.type === 2;
  }

  isAutocomplete(): boolean {
    return this.#raw.type === 4;
  }

  isRepliable(): boolean {
    return this.#raw.type === 2 || this.#raw.type === 3 || this.#raw.type === 5;
  }

  #buffer(response: DiscordInteractionResponse): boolean {
    if (this.#responded) return false;
    this.#responded = true;
    this.#respond(response);
    return true;
  }

  #adopt(body: unknown): RestMessage {
    const record = (body ?? {}) as { id?: string; channel_id?: string; flags?: number };
    return new RestMessage({
      id: String(record.id ?? ""),
      channelId: record.channel_id ?? this.#raw.channel_id,
      ephemeral: (Number(record.flags ?? 0) & EPHEMERAL_FLAG) !== 0,
      edit: (payload) => this.#editMessage(payload, String(record.id ?? "")),
    });
  }

  async #editMessage(payload: DiscordPayload, messageId: string): Promise<RestMessage> {
    assertJsonPayload(payload);
    if (this.#modal) {
      // A modal is the interaction response; the message edit happens after submit.
      return this.#message ?? this.#adopt({ id: messageId });
    }
    if (this.#mode === "inline" && !this.#responded) {
      this.#replied = true;
      this.#buffer({ type: InteractionResponseType.updateMessage, data: payload });
      return this.#message ?? this.#adopt({ id: messageId });
    }
    if (this.#message?.ephemeral === true) {
      const body = await this.#rest.editOriginal(this.applicationId, this.token, payload);
      return this.#adopt(body);
    }
    if (this.#message?.channelId !== undefined && messageId !== "") {
      const body = await this.#rest.editChannelMessage(this.#message.channelId, messageId, payload);
      return this.#adopt(body);
    }
    const body = await this.#rest.editOriginal(this.applicationId, this.token, payload);
    return this.#adopt(body);
  }

  async #sendFirst(payload: DiscordPayload, forceReply = false): Promise<RestMessage> {
    assertJsonPayload(payload);
    if (this.#mode === "inline" && !this.#responded) {
      this.#replied = true;
      this.#buffer({
        type:
          forceReply || this.#message === undefined
            ? InteractionResponseType.channelMessage
            : InteractionResponseType.updateMessage,
        data: payload,
      });
      return (
        this.#message ??
        this.#adopt({ id: "", channel_id: this.#raw.channel_id, flags: payload.flags })
      );
    }

    if (this.#mode === "deferred" && this.#message === undefined) {
      const body = await this.#rest.editOriginal(this.applicationId, this.token, payload);
      return this.#adopt(body);
    }

    if (this.#message !== undefined) {
      return this.#editMessage(payload, this.#message.id);
    }
    const body = await this.#rest.followUp(this.applicationId, this.token, payload);
    return this.#adopt(body);
  }

  send(payload: DiscordPayload): Promise<RestMessage> {
    return this.#sendFirst(payload);
  }

  reply(payload: DiscordPayload): Promise<RestMessage> {
    return this.#sendFirst(payload, true);
  }

  editReply(payload: DiscordPayload): Promise<RestMessage> {
    return this.#message === undefined
      ? this.#sendFirst(payload)
      : this.#editMessage(payload, this.#message.id);
  }

  update(payload: DiscordPayload): Promise<RestMessage> {
    return this.editReply(payload);
  }

  followUp(payload: DiscordPayload): Promise<RestMessage> {
    return this.#rest
      .followUp(this.applicationId, this.token, payload)
      .then((body) => this.#adopt(body));
  }

  async deferUpdate(): Promise<void> {
    this.#deferred = true;
    if (this.#mode === "inline" && !this.#responded) {
      this.#buffer({ type: InteractionResponseType.deferredUpdate });
    }
  }

  async deferReply(): Promise<void> {
    this.#deferred = true;
    if (this.#mode === "inline" && !this.#responded) {
      this.#buffer({ type: InteractionResponseType.deferredChannelMessage });
    }
  }

  async showModal(modal: { toJSON(): unknown }): Promise<void> {
    if (this.#mode === "deferred" || this.#responded) {
      throw new Error("An HTTP interaction cannot show a modal after it was acknowledged");
    }
    this.#modal = true;
    this.#replied = true;
    this.#buffer({ type: InteractionResponseType.modal, data: modal.toJSON() });
  }
}

/** The public HTTP handler options. */
export interface DiscordInteractionsHandlerOptions {
  readonly client: AronaDiscordClient;
  /** The application's Ed25519 public key, hex. */
  readonly publicKey: string;
  /**
   * Override signature verification on runtimes without Node's `crypto`,
   * such as a WebCrypto-based Cloudflare adapter.
   */
  readonly verify?:
    | ((options: {
        readonly publicKey: string;
        readonly signature: string;
        readonly timestamp: string;
        readonly body: string;
      }) => boolean | Promise<boolean>)
    | undefined;
  /** Bot token used for channel edits and follow-ups. */
  readonly token: string;
  readonly rest?: DiscordRest | undefined;
  readonly apiBase?: string | undefined;
  readonly fetch?: typeof fetch | undefined;
  /**
   * Acknowledge first and process in the background. This supports slow work
   * but cannot open modals: a modal must be the initial response.
   */
  readonly defer?: boolean | undefined;
  /** Platform hook such as Cloudflare's `ctx.waitUntil` or Vercel's `waitUntil`. */
  readonly background?: ((work: Promise<void>) => void) | undefined;
  readonly onError?: ((error: unknown) => void) | undefined;
}

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const defaultResponse = (raw: RawDiscordInteraction): DiscordInteractionResponse =>
  raw.type === 2
    ? {
        type: InteractionResponseType.channelMessage,
        data: { content: "This command did not produce a response.", flags: EPHEMERAL_FLAG },
      }
    : raw.type === 4
      ? { type: InteractionResponseType.autocomplete, data: { choices: [] } }
      : { type: InteractionResponseType.deferredUpdate };

/**
 * A Fetch API handler for Discord's Interactions Endpoint URL.
 *
 * Inline mode processes before responding, so it can return modals and the
 * first message/update as the initial response. Deferred mode acknowledges
 * immediately and finishes through REST; use it for slow work and prefer an
 * interaction flow that does not open modals.
 */
export const createInteractionsHandler = (options: DiscordInteractionsHandlerOptions) => {
  const rest =
    options.rest ??
    new DiscordRest({
      token: options.token,
      ...(options.apiBase === undefined ? {} : { apiBase: options.apiBase }),
      ...(options.fetch === undefined ? {} : { fetch: options.fetch }),
    });
  const onError =
    options.onError ??
    ((error: unknown) => {
      console.error(error);
    });
  const verifyRequest = options.verify ?? verifyDiscordSignature;

  return async (request: Request): Promise<Response> => {
    if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

    const body = await request.text();
    const signature = request.headers.get("x-signature-ed25519") ?? "";
    const timestamp = request.headers.get("x-signature-timestamp") ?? "";
    if (
      !(await verifyRequest({
        publicKey: options.publicKey,
        signature,
        timestamp,
        body,
      }))
    ) {
      return new Response("invalid request signature", { status: 401 });
    }

    let raw: RawDiscordInteraction;
    try {
      raw = JSON.parse(body) as RawDiscordInteraction;
    } catch {
      return new Response("invalid JSON", { status: 400 });
    }

    if (raw.type === 1) return json({ type: InteractionResponseType.pong });
    if (raw.type === 4) {
      return json({ type: InteractionResponseType.autocomplete, data: { choices: [] } });
    }

    if (options.defer === true) {
      const ack: DiscordInteractionResponse = {
        type:
          raw.type === 2
            ? InteractionResponseType.deferredChannelMessage
            : InteractionResponseType.deferredUpdate,
      };
      const interaction = new RestInteraction({
        raw,
        client: options.client,
        rest,
        mode: "deferred",
        respond: () => {},
        initialResponseSent: true,
      });
      const work = (async () => {
        try {
          await options.client.handleInteraction(interaction as unknown as Interaction, {
            fresh: true,
          });
        } finally {
          await options.client.releaseSessionRoots().catch(onError);
        }
      })().catch(onError);
      if (options.background !== undefined) options.background(work);
      else void work;
      return json(ack);
    }

    let response: DiscordInteractionResponse | undefined;
    const interaction = new RestInteraction({
      raw,
      client: options.client,
      rest,
      mode: "inline",
      respond: (next) => {
        response ??= next;
      },
    });

    try {
      await options.client.handleInteraction(interaction as unknown as Interaction, {
        fresh: true,
      });
    } catch (error) {
      onError(error);
      response ??= {
        type: InteractionResponseType.channelMessage,
        data: { content: "This interaction failed. Please try again.", flags: EPHEMERAL_FLAG },
      };
    } finally {
      await options.client.releaseSessionRoots().catch(onError);
    }

    return json(response ?? defaultResponse(raw));
  };
};
