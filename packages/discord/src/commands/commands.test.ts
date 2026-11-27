import { Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { Text } from "../components";
import { FakeChannel, findComponent } from "../testing";
import * as Discord from "../vocabulary";
import { SlashCommandBuilder, getTypedInteraction } from "./command-builder";
import { createSlashCommand } from "./create-slash-command";
import {
  commandBodies,
  commandRoute,
  commandSummaries,
  fetchGuildName,
} from "./helpers/reload-commands";

describe("getTypedInteraction", () => {
  it("reads typed option values into params", () => {
    const command = new SlashCommandBuilder<unknown>()
      .addTypedStringOption((option) => option.setName("name").setRequired(true))
      .addTypedIntegerOption((option) => option.setName("count"));

    const interaction = {
      options: {
        getString: (name: string) => (name === "name" ? "Ada" : null),
        getInteger: (name: string) => (name === "count" ? 2 : null),
      },
    };

    const typed = getTypedInteraction(
      command as SlashCommandBuilder<{ name: string; count?: number }>,
      interaction as never,
    );
    expect(typed.params).toEqual({ name: "Ada", count: 2 });
  });
});

describe("reload command helpers", () => {
  const command = new SlashCommandBuilder().setName("ping").setDescription("Ping");

  it("uses guild routes when a dev guild is set", () => {
    expect(commandRoute({ clientId: "client", devGuildId: "guild" })).toBe(
      "/applications/client/guilds/guild/commands",
    );
    expect(commandRoute({ clientId: "client" })).toBe("/applications/client/commands");
  });

  it("maps command wrappers and builders to JSON bodies", () => {
    const bodies = commandBodies([
      command,
      { command: new SlashCommandBuilder().setName("pong").setDescription("Pong") },
    ]);
    expect(bodies.map((body) => (body as { name: string }).name)).toEqual(["ping", "pong"]);
  });

  it("summarizes command names and their arguments", () => {
    const search = new SlashCommandBuilder<unknown>()
      .setName("search")
      .setDescription("Search")
      .addTypedStringOption((option) =>
        option.setName("query").setDescription("Query").setRequired(true),
      )
      .addTypedIntegerOption((option) => option.setName("limit").setDescription("Limit"));

    expect(commandSummaries([command, search])).toEqual([
      "ping",
      "search(query:string!, limit:integer)",
    ]);
  });

  it("does not fetch a guild name without a dev guild", async () => {
    await expect(fetchGuildName({ token: "token" })).resolves.toBeUndefined();
  });
});

describe("createSlashCommand", () => {
  it("renders the component with the command params as props", async () => {
    const CommandView = Discord.component({
      name: "CommandView",
      props: Schema.Struct({ name: Schema.String }),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => Text(h, `Hello ${h.props.name}`),
    });

    const command = createSlashCommand<{ name: string }>("hello", {
      command: (builder) => builder.setDescription("Say hello"),
      component: CommandView,
    });

    const channel = new FakeChannel();
    const interaction = {
      commandName: "hello",
      params: { name: "world" },
      send: (payload: unknown) => channel.send(payload),
    };

    await command.handler(interaction as never);

    expect(command.name).toBe("hello");
    expect((command.command as { name?: string }).name).toBe("hello");
    const text = findComponent(channel.sent[0], (component) => component.type === 10);
    expect(text?.content).toBe("Hello world");
  });

  it("ignores other command names", async () => {
    const command = createSlashCommand("hello", {
      command: (builder) => builder.setDescription("Say hello"),
    });
    await expect(command.handler({ commandName: "other" } as never)).resolves.toBeUndefined();
  });
});
