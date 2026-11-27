/** The subset of the Discord REST API Arona needs for HTTP interactions. */
export interface DiscordRestOptions {
  readonly token: string;
  /** Defaults to `https://discord.com/api/v10`. */
  readonly apiBase?: string | undefined;
  readonly fetch?: typeof fetch | undefined;
}

/** A message or interaction response payload from the renderer. */
export interface DiscordPayload {
  readonly content?: string | undefined;
  readonly components?: ReadonlyArray<unknown> | undefined;
  readonly files?: ReadonlyArray<unknown> | undefined;
  readonly flags?: number | undefined;
  readonly [key: string]: unknown;
}

/** Throws when a payload needs multipart upload, which HTTP mode lacks. */
export const assertJsonPayload = (payload: DiscordPayload): void => {
  if (payload.files !== undefined && payload.files.length > 0) {
    throw new Error(
      "HTTP interaction messages with file attachments are not supported yet; use multiple components or a URL",
    );
  }
};

const jsonBody = (payload: DiscordPayload): string => {
  assertJsonPayload(payload);
  const { files: _files, ...rest } = payload;
  return JSON.stringify(rest);
};

/** A small REST client over `fetch`, used by the HTTP interaction adapter. */
export class DiscordRest {
  readonly #token: string;
  readonly #base: string;
  readonly #fetch: typeof fetch;

  constructor(options: DiscordRestOptions) {
    this.#token = options.token;
    this.#base = (options.apiBase ?? "https://discord.com/api/v10").replace(/\/+$/, "");
    this.#fetch = options.fetch ?? globalThis.fetch;
  }

  async #request(method: string, path: string, payload?: DiscordPayload): Promise<unknown> {
    const response = await this.#fetch(`${this.#base}${path}`, {
      method,
      headers: {
        Authorization: `Bot ${this.#token}`,
        "Content-Type": "application/json",
      },
      ...(payload === undefined ? {} : { body: jsonBody(payload) }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`Discord REST ${method} ${path} failed: ${response.status} ${text}`);
    }

    if (response.status === 204) return undefined;
    const text = await response.text();
    return text === "" ? undefined : JSON.parse(text);
  }

  editChannelMessage(
    channelId: string,
    messageId: string,
    payload: DiscordPayload,
  ): Promise<unknown> {
    return this.#request(
      "PATCH",
      `/channels/${encodeURIComponent(channelId)}/messages/${encodeURIComponent(messageId)}`,
      payload,
    );
  }

  editOriginal(
    applicationId: string,
    interactionToken: string,
    payload: DiscordPayload,
  ): Promise<unknown> {
    return this.#request(
      "PATCH",
      `/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interactionToken)}/messages/@original`,
      payload,
    );
  }

  followUp(
    applicationId: string,
    interactionToken: string,
    payload: DiscordPayload,
  ): Promise<unknown> {
    return this.#request(
      "POST",
      `/webhooks/${encodeURIComponent(applicationId)}/${encodeURIComponent(interactionToken)}`,
      payload,
    );
  }
}
