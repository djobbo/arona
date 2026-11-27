import {
  CommandRegistry,
  Telemetry,
  TelemetryMetrics,
  TelemetrySpans,
  parseInteractionId,
  type InteractionIdParts,
  type MessageSession,
  type MessageSessionStoreShape,
  type TelemetryHandle,
} from "@arona/core";
import type { Component } from "@effect/ui";
import { Client, type ClientOptions, type Interaction, type Message } from "discord.js";
import { Effect, Option } from "effect";
import {
  getTypedInteraction,
  type SlashCommandBuilder,
  type SlashCommandInteraction,
} from "./commands/command-builder";
import {
  commandSummaries,
  fetchGuildName,
  reloadCommands,
} from "./commands/helpers/reload-commands";
import { mountSessionMessage } from "./render";
import type { DiscordMessageRoot } from "./root";
import type { InteractionRef } from "./types";

type AnyComponent = Component.Members<string, any, any, any, any, any, any, any>;

/** Per-component hooks the client uses when it resumes a session. */
export interface ResumableComponentOptions {
  /** Rebuilds live props from the stored props and the current interaction. */
  readonly decodeProps?: (props: unknown, interaction: Interaction) => unknown;
}

export interface AronaDiscordClientOptions extends ClientOptions {
  readonly token: string;
  readonly clientId: string;
  readonly devGuildId?: string | undefined;
  /**
   * Telemetry runtime to install for this client. Defaults to an
   * environment-configured runtime (`OTEL_EXPORTER_OTLP_ENDPOINT`).
   */
  readonly telemetry?: TelemetryHandle | undefined;
  /**
   * Durable state for resumable messages. Build it with `layerMemory` or
   * `layerFile` from `@arona/core` and pass the service here.
   */
  readonly sessions?: MessageSessionStoreShape | undefined;
  /** Application build fingerprint. Empty means "do not check". */
  readonly build?: string | undefined;
}

const interactionType = (interaction: Interaction): string => {
  if (interaction.isChatInputCommand()) return "command";
  if (interaction.isButton()) return "button";
  if (interaction.isAnySelectMenu()) return "select";
  if (interaction.isModalSubmit()) return "modal";
  if (interaction.isAutocomplete()) return "autocomplete";
  return "unknown";
};

export interface RegisteredCommand {
  readonly name: string;
  readonly command: SlashCommandBuilder<any>;
  handler(interaction: SlashCommandInteraction<any>): Promise<void>;
  /** The component a resumed message from this command should mount. */
  readonly session?:
    | {
        readonly key: string;
        readonly component: AnyComponent;
        readonly decodeProps?: (props: unknown, interaction: Interaction) => unknown;
      }
    | undefined;
}

/** A Discord client that owns Arona commands and rendered message roots. */
export class AronaDiscordClient extends Client {
  readonly #token: string;
  readonly #devGuildId: string | undefined;
  readonly #clientId: string;
  readonly #commands = new CommandRegistry<RegisteredCommand>();
  readonly #interactionRoots = new Map<string, DiscordMessageRoot>();
  readonly #sessionRoots = new Map<string, DiscordMessageRoot>();
  readonly #components = new Map<
    string,
    { readonly component: AnyComponent; readonly options: ResumableComponentOptions }
  >();
  readonly #telemetry: TelemetryHandle;
  readonly #sessions: MessageSessionStoreShape | undefined;
  readonly #build: string;

  constructor({
    token,
    devGuildId,
    clientId,
    telemetry,
    sessions,
    build,
    ...options
  }: AronaDiscordClientOptions) {
    super(options);
    this.#token = token;
    this.#devGuildId = devGuildId;
    this.#clientId = clientId;
    this.#sessions = sessions;
    this.#build = build ?? "";
    this.#telemetry = telemetry ? Telemetry.install(telemetry) : Telemetry.installFromEnv();
    super.on("interactionCreate", this.globalInteractionListener);
  }

  /** The session store this client resumes from, if one was provided. */
  get sessions(): MessageSessionStoreShape | undefined {
    return this.#sessions;
  }

  /** The application build fingerprint checked against stored sessions. */
  get build(): string {
    return this.#build;
  }

  /** Makes a component resolvable by a session's `component` key. */
  registerComponent(
    key: string,
    component: AnyComponent,
    options: ResumableComponentOptions = {},
  ): this {
    const existing = this.#components.get(key);
    this.#components.set(key, {
      component,
      options: { ...existing?.options, ...options },
    });
    return this;
  }

  get commands(): ReadonlyArray<RegisteredCommand> {
    return this.#commands.list();
  }

  /** The telemetry runtime used by this client and its rendered messages. */
  get telemetry(): TelemetryHandle {
    return this.#telemetry;
  }

  login(): Promise<string> {
    void this.reloadCommands();
    return this.#telemetry.span(
      TelemetrySpans.clientLogin,
      {
        attributes: {
          "messaging.system": "discord",
          "arona.client.id": this.#clientId,
        },
      },
      () => super.login(this.#token),
    );
  }

  async reloadCommands(): Promise<void> {
    const summaries = commandSummaries(this.#commands.list());
    const guildName = await fetchGuildName({
      token: this.#token,
      ...(this.#devGuildId === undefined ? {} : { devGuildId: this.#devGuildId }),
    });
    const attributes = {
      "messaging.system": "discord",
      "arona.client.id": this.#clientId,
      "arona.commands.count": this.#commands.size,
      ...(summaries.length === 0 ? {} : { "arona.commands": summaries.join(", ") }),
      ...(this.#devGuildId === undefined ? {} : { "arona.guild.id": this.#devGuildId }),
      ...(guildName === undefined ? {} : { "arona.guild.name": guildName }),
    };

    await this.#telemetry.span(TelemetrySpans.commandsReload, { attributes }, () =>
      reloadCommands({
        token: this.#token,
        ...(this.#devGuildId === undefined ? {} : { devGuildId: this.#devGuildId }),
        ...(guildName === undefined ? {} : { guildName }),
        clientId: this.#clientId,
        commands: this.#commands.list(),
      }),
    );
  }

  async destroy(): Promise<void> {
    super.off("interactionCreate", this.globalInteractionListener);
    await Promise.all([...this.#interactionRoots.values()].map((root) => root.unmount()));
    this.#interactionRoots.clear();
    this.#sessionRoots.clear();
    await super.destroy();
  }

  globalInteractionListener: (interaction: Interaction) => void = (interaction) => {
    void this.handleInteraction(interaction).catch((error: unknown) => console.error(error));
  };

  /**
   * Handles one interaction, including commands, warm roots and cold session
   * resumes. Exposed separately so tests and HTTP adapters can await it.
   *
   * `fresh` discards a warm session root first. HTTP adapters use it because
   * every interaction has its own response buffer and interaction token.
   */
  async handleInteraction(
    interaction: Interaction,
    options: { readonly fresh?: boolean } = {},
  ): Promise<void> {
    const type = interactionType(interaction);
    await this.#telemetry.span(
      TelemetrySpans.interaction,
      {
        kind: "consumer",
        attributes: {
          "messaging.system": "discord",
          "arona.interaction.type": type,
        },
      },
      async () => {
        let handled = false;

        if (interaction.isChatInputCommand()) {
          const command = this.#commands.get(interaction.commandName);
          if (command) {
            handled = true;
            await this.#telemetry.span(
              TelemetrySpans.command,
              {
                attributes: {
                  "messaging.system": "discord",
                  "arona.command": interaction.commandName,
                },
              },
              async () => {
                try {
                  await command.handler(getTypedInteraction(command.command, interaction));
                  this.#telemetry.counter(TelemetryMetrics.commandsExecuted, 1, {
                    "messaging.system": "discord",
                    "arona.command": interaction.commandName,
                  });
                } catch (error) {
                  this.#telemetry.counter(TelemetryMetrics.commandErrors, 1, {
                    "messaging.system": "discord",
                    "arona.command": interaction.commandName,
                  });
                  throw error;
                }
              },
            );
          }
        }

        const parts =
          "customId" in interaction ? parseInteractionId(interaction.customId) : undefined;
        if (!handled && parts !== undefined && this.#sessions !== undefined) {
          handled = await this.#handleSessionInteraction(
            interaction,
            parts,
            options.fresh === true,
          );
        }

        if (!handled) {
          const roots = [...this.#interactionRoots.values()];
          await Promise.all(roots.map((root) => root.interactionListener(interaction)));
        }

        this.#telemetry.counter(TelemetryMetrics.interactions, 1, {
          "messaging.system": "discord",
          "arona.interaction.type": type,
          "arona.handled": handled,
        });
      },
    );
  }

  async #handleSessionInteraction(
    interaction: Interaction,
    parts: InteractionIdParts,
    fresh: boolean,
  ): Promise<boolean> {
    const store = this.#sessions;
    if (store === undefined) return false;

    const found = await Effect.runPromise(store.get(parts.sessionId));
    if (Option.isNone(found)) return false;

    const session = found.value;
    if (
      session.status === "closed" ||
      (session.expiresAt !== undefined && session.expiresAt <= Date.now())
    ) {
      return false;
    }
    if (session.build !== "" && this.#build !== "" && session.build !== this.#build) {
      return false;
    }

    let root = this.#sessionRoots.get(session.id);
    if (root !== undefined && (fresh || root.closed || root.sessionVersion !== session.version)) {
      await root.unmount();
      root = undefined;
    }

    const stale = parts.version !== session.version;
    if (root === undefined) {
      root = await this.#resumeSession(interaction, session, stale);
      if (root === undefined) return false;
    }

    if (stale) {
      if (
        interaction.isRepliable() &&
        !interaction.replied &&
        !interaction.deferred &&
        "deferUpdate" in interaction
      ) {
        await interaction.deferUpdate().catch((error: unknown) => console.error(error));
      }
      return true;
    }

    await root.interactionListener(interaction);
    return true;
  }

  async #resumeSession(
    interaction: Interaction,
    session: MessageSession,
    heal: boolean,
  ): Promise<DiscordMessageRoot | undefined> {
    const store = this.#sessions;
    if (store === undefined) return undefined;

    const registered = this.#components.get(session.component);
    if (registered === undefined) return undefined;

    const message =
      "message" in interaction ? (interaction.message as Message | undefined) : undefined;
    if (message === undefined) return undefined;

    const props = registered.options.decodeProps?.(session.props, interaction) ?? session.props;

    const { root } = await mountSessionMessage(
      interaction as unknown as InteractionRef,
      registered.component,
      props as never,
      {
        store,
        session,
        componentKey: session.component,
        resume: message,
        skipInitial: !heal,
        ...(session.ephemeral ? { ephemeral: true } : {}),
        telemetry: this.#telemetry,
      },
    );
    return root;
  }

  /** Unmounts every session root without stopping the client. */
  async releaseSessionRoots(): Promise<void> {
    const roots = [...this.#sessionRoots.values()];
    await Promise.all(roots.map((root) => root.unmount()));
    this.#sessionRoots.clear();
  }

  addRoot(root: DiscordMessageRoot): this {
    this.#interactionRoots.set(root.uuid, root);
    if (root.sessionId !== undefined) this.#sessionRoots.set(root.sessionId, root);
    return this;
  }

  removeInteractionListener(uuid: string): this {
    const root = this.#interactionRoots.get(uuid);
    this.#interactionRoots.delete(uuid);
    if (
      root?.sessionId !== undefined &&
      this.#sessionRoots.get(root.sessionId)?.uuid === root.uuid
    ) {
      this.#sessionRoots.delete(root.sessionId);
    }
    return this;
  }

  addCommand(command: RegisteredCommand): this {
    this.#commands.add(command);
    this.#registerCommandSession(command);
    this.#telemetry.counter(TelemetryMetrics.commandsRegistered, 1, {
      "messaging.system": "discord",
      "arona.command": command.name,
    });
    return this;
  }

  addCommands(commands: ReadonlyArray<RegisteredCommand>): this {
    this.#commands.addAll(commands);
    for (const command of commands) {
      this.#registerCommandSession(command);
      this.#telemetry.counter(TelemetryMetrics.commandsRegistered, 1, {
        "messaging.system": "discord",
        "arona.command": command.name,
      });
    }
    return this;
  }

  #registerCommandSession(command: RegisteredCommand): void {
    if (command.session === undefined) return;
    this.registerComponent(
      command.session.key,
      command.session.component,
      command.session.decodeProps === undefined ? {} : { decodeProps: command.session.decodeProps },
    );
  }

  removeCommand(name: string): this {
    this.#commands.remove(name);
    return this;
  }
}
