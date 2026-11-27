import {
  CommandRegistry,
  Telemetry,
  TelemetryMetrics,
  TelemetrySpans,
  type TelemetryHandle,
} from "@arona/core";
import { Client, type ClientOptions, type Interaction } from "discord.js";
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
import type { DiscordMessageRoot } from "./root";

export interface AronaDiscordClientOptions extends ClientOptions {
  readonly token: string;
  readonly clientId: string;
  readonly devGuildId?: string | undefined;
  /**
   * Telemetry runtime to install for this client. Defaults to an
   * environment-configured runtime (`OTEL_EXPORTER_OTLP_ENDPOINT`).
   */
  readonly telemetry?: TelemetryHandle | undefined;
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
}

/** A Discord client that owns Arona commands and rendered message roots. */
export class AronaDiscordClient extends Client {
  readonly #token: string;
  readonly #devGuildId: string | undefined;
  readonly #clientId: string;
  readonly #commands = new CommandRegistry<RegisteredCommand>();
  readonly #interactionRoots = new Map<string, DiscordMessageRoot>();
  readonly #telemetry: TelemetryHandle;

  constructor({ token, devGuildId, clientId, telemetry, ...options }: AronaDiscordClientOptions) {
    super(options);
    this.#token = token;
    this.#devGuildId = devGuildId;
    this.#clientId = clientId;
    this.#telemetry = telemetry ? Telemetry.install(telemetry) : Telemetry.installFromEnv();
    super.on("interactionCreate", this.globalInteractionListener);
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
    await super.destroy();
  }

  globalInteractionListener: (interaction: Interaction) => void = (interaction) => {
    const type = interactionType(interaction);
    void this.#telemetry
      .span(
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

          const roots = [...this.#interactionRoots.values()];
          await Promise.all(roots.map((root) => root.interactionListener(interaction)));

          this.#telemetry.counter(TelemetryMetrics.interactions, 1, {
            "messaging.system": "discord",
            "arona.interaction.type": type,
            "arona.handled": handled,
          });
        },
      )
      .catch((error: unknown) => console.error(error));
  };

  addRoot(root: DiscordMessageRoot): this {
    this.#interactionRoots.set(root.uuid, root);
    return this;
  }

  removeInteractionListener(uuid: string): this {
    this.#interactionRoots.delete(uuid);
    return this;
  }

  addCommand(command: RegisteredCommand): this {
    this.#commands.add(command);
    this.#telemetry.counter(TelemetryMetrics.commandsRegistered, 1, {
      "messaging.system": "discord",
      "arona.command": command.name,
    });
    return this;
  }

  addCommands(commands: ReadonlyArray<RegisteredCommand>): this {
    this.#commands.addAll(commands);
    for (const command of commands) {
      this.#telemetry.counter(TelemetryMetrics.commandsRegistered, 1, {
        "messaging.system": "discord",
        "arona.command": command.name,
      });
    }
    return this;
  }

  removeCommand(name: string): this {
    this.#commands.remove(name);
    return this;
  }
}
