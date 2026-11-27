import { layerMemory, MessageSessionStore, type MessageSessionStoreShape } from "@arona/core";
import { UiSchema } from "@effect/ui";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vite-plus/test";
import { ActionRow, Button, Container, Text } from "../components";
import { AronaDiscordClient } from "../client";
import { FakeChannel, findButtonCustomId, findComponent } from "../testing";
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

  it("creates a resumable session when the client has a store", async () => {
    const store = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* MessageSessionStore;
      }).pipe(Effect.provide(layerMemory)),
    );

    const CommandView = Discord.component({
      name: "SessionCommandView",
      props: Schema.Struct({ name: Schema.String }),
      model: Schema.Struct({}),
      message: Schema.Never,
    }).make({
      init: () => ({}),
      update: ($) => $.model,
      view: (h) => Text(h, `Hello ${h.props.name}`),
    });

    const command = createSlashCommand<{ name: string }>("hello", {
      command: (builder) =>
        builder
          .setDescription("Say hello")
          .addTypedStringOption((option) => option.setName("name").setRequired(true)),
      component: CommandView,
    });

    const roots: Array<{ unmount(): Promise<void> }> = [];
    const client = {
      sessions: store,
      build: "",
      addRoot(root: { unmount(): Promise<void> }) {
        roots.push(root);
        return root;
      },
      removeInteractionListener() {},
      registerComponent() {},
    };

    const channel = new FakeChannel();
    await command.handler({
      commandName: "hello",
      params: { name: "world" },
      client,
      send: (payload: unknown) => channel.send(payload),
    } as never);

    const active = await Effect.runPromise((store as MessageSessionStoreShape).listActive());
    expect(active).toHaveLength(1);
    expect(active[0]?.component).toBe("hello");
    expect(active[0]?.props).toEqual({ params: { name: "world" } });
    expect(active[0]?.state).toBeDefined();
    expect(roots).toHaveLength(1);

    await roots[0]?.unmount();
  });

  it("resumes a command message after the client restarts", async () => {
    const store = await Effect.runPromise(
      Effect.gen(function* () {
        return yield* MessageSessionStore;
      }).pipe(Effect.provide(layerMemory)),
    );

    const Clicked = UiSchema.TaggedEnum({ Clicked: {} });
    const View = Discord.component({
      name: "RestartCommandView",
      props: Schema.Struct({}),
      model: Schema.Struct({ count: Schema.Number }),
      message: Clicked,
    }).make({
      init: () => ({ count: 0 }),
      update: { Clicked: ($) => $.evolve({ count: (count) => count + 1 }) },
      view: (h, model) =>
        Container(h, {
          children: [
            Text(h, `# Count: ${model.count}`),
            ActionRow(h, {
              children: [
                Button(h, { style: "Primary", onClick: Clicked.Clicked(), children: ["+"] }),
              ],
            }),
          ],
        }),
    });

    const command = createSlashCommand("counter", {
      command: (builder) => builder.setDescription("Count"),
      component: View,
    });

    const makeClient = () =>
      new AronaDiscordClient({
        token: "token",
        clientId: "client",
        intents: [],
        sessions: store,
      }).addCommands([command]);

    const first = makeClient();
    const channel = new FakeChannel();
    await command.handler({
      commandName: "counter",
      params: {},
      client: first,
      send: (payload: unknown) => channel.send(payload),
    } as never);
    const customId = findButtonCustomId(channel.sent[0]);
    await first.destroy();

    const second = makeClient();
    const edits: unknown[] = [];
    const message = {
      id: "message",
      channelId: "channel",
      edit: async (payload: unknown) => {
        edits.push(payload);
        return message;
      },
    };
    const interaction = {
      customId,
      client: second,
      message,
      replied: false,
      deferred: false,
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

    await second.handleInteraction(interaction as never);

    const text = findComponent(edits[0], (component) => component.type === 10);
    expect(text?.content).toBe("# Count: 1");
    await second.destroy();
  });
});
