import { Telemetry, TelemetryMetrics } from "@arona/core";
import { ApplicationCommandOptionType, REST, Routes, type SlashCommandBuilder } from "discord.js";

export interface ReloadCommandsOptions {
  readonly token: string;
  readonly clientId: string;
  readonly devGuildId?: string | undefined;
  /** Resolved guild name, used for logs and span attributes when available. */
  readonly guildName?: string | undefined;
  readonly commands: ReadonlyArray<SlashCommandBuilder | { readonly command: SlashCommandBuilder }>;
}

interface CommandOptionJson {
  readonly name: string;
  readonly type: number;
  readonly required?: boolean;
  readonly options?: ReadonlyArray<CommandOptionJson>;
}

interface CommandJson {
  readonly name: string;
  readonly options?: ReadonlyArray<CommandOptionJson>;
}

/** The REST route application commands are registered on. */
export const commandRoute = ({
  clientId,
  devGuildId,
}: Pick<ReloadCommandsOptions, "clientId" | "devGuildId">): `/${string}` =>
  devGuildId
    ? Routes.applicationGuildCommands(clientId, devGuildId)
    : Routes.applicationCommands(clientId);

/** The JSON bodies sent to Discord for the registered commands. */
export const commandBodies = (commands: ReloadCommandsOptions["commands"]): unknown[] =>
  commands.map((command) => ("command" in command ? command.command.toJSON() : command.toJSON()));

const optionTypeName = (type: number): string => {
  switch (type) {
    case ApplicationCommandOptionType.Subcommand:
      return "subcommand";
    case ApplicationCommandOptionType.SubcommandGroup:
      return "group";
    case ApplicationCommandOptionType.String:
      return "string";
    case ApplicationCommandOptionType.Integer:
      return "integer";
    case ApplicationCommandOptionType.Boolean:
      return "boolean";
    case ApplicationCommandOptionType.User:
      return "user";
    case ApplicationCommandOptionType.Channel:
      return "channel";
    case ApplicationCommandOptionType.Role:
      return "role";
    case ApplicationCommandOptionType.Mentionable:
      return "mentionable";
    case ApplicationCommandOptionType.Number:
      return "number";
    case ApplicationCommandOptionType.Attachment:
      return "attachment";
    default:
      return String(type);
  }
};

const formatOption = (option: CommandOptionJson): string => {
  const required = option.required === true ? "!" : "";
  const nested =
    option.options && option.options.length > 0
      ? `(${option.options.map(formatOption).join(", ")})`
      : "";
  return `${option.name}:${optionTypeName(option.type)}${required}${nested}`;
};

/**
 * A low-cardinality description of each command and its arguments, for logs
 * and telemetry attributes such as `rick-and-morty(query:string!)`.
 */
export const commandSummaries = (
  commands: ReloadCommandsOptions["commands"],
): ReadonlyArray<string> =>
  commands.map((command) => {
    const body = (
      "command" in command ? command.command.toJSON() : command.toJSON()
    ) as CommandJson;
    const options = body.options ?? [];
    const args = options.length > 0 ? `(${options.map(formatOption).join(", ")})` : "";
    return `${body.name}${args}`;
  });

/** Resolves the development guild name without requiring a gateway session. */
export const fetchGuildName = async ({
  token,
  devGuildId,
}: Pick<ReloadCommandsOptions, "token" | "devGuildId">): Promise<string | undefined> => {
  if (devGuildId === undefined) return undefined;

  try {
    const rest = new REST().setToken(token);
    const guild = (await rest.get(`/guilds/${devGuildId}`)) as { name?: string };
    return guild.name;
  } catch {
    return undefined;
  }
};

/** Replaces the application's command list with the provided commands. */
export const reloadCommands = async ({
  token,
  clientId,
  devGuildId,
  guildName,
  commands,
}: ReloadCommandsOptions): Promise<void> => {
  const rest = new REST().setToken(token);
  const telemetry = Telemetry.current();
  const resolvedGuildName = guildName ?? (await fetchGuildName({ token, devGuildId }));
  const summaries = commandSummaries(commands);
  const target =
    resolvedGuildName === undefined
      ? ""
      : ` in ${resolvedGuildName}${devGuildId === undefined ? "" : ` (${devGuildId})`}`;
  const attributes = {
    "messaging.system": "discord",
    "arona.commands.count": commands.length,
    ...(summaries.length === 0 ? {} : { "arona.commands": summaries.join(", ") }),
    ...(devGuildId === undefined ? {} : { "arona.guild.id": devGuildId }),
    ...(resolvedGuildName === undefined ? {} : { "arona.guild.name": resolvedGuildName }),
  };

  const details = summaries.length === 0 ? "" : `: ${summaries.join(", ")}`;

  try {
    console.log(
      `⏳ Started refreshing ${commands.length} application (/) command${commands.length === 1 ? "" : "s"}${target}${details}.`,
    );
    await rest.put(commandRoute({ clientId, devGuildId }), {
      body: commandBodies(commands),
    });
    telemetry.counter(TelemetryMetrics.commandsReloaded, 1, attributes);
    console.log(
      `✅ Successfully reloaded application (/) command${commands.length === 1 ? "" : "s"}${target}.`,
    );
  } catch (error) {
    telemetry.counter(TelemetryMetrics.commandErrors, 1, {
      ...attributes,
      "arona.stage": "reload",
    });
    console.error(error);
  }
};
