import { describe, expect, it } from "vite-plus/test";
import { SlashCommandBuilder } from "./commands/command-builder";
import { AronaDiscordClient } from "./client";

const command = {
  name: "ping",
  command: new SlashCommandBuilder().setName("ping").setDescription("Ping"),
  handler: async () => {},
};

describe("AronaDiscordClient", () => {
  it("registers, lists, and removes commands", async () => {
    const client = new AronaDiscordClient({
      token: "token",
      clientId: "client",
      intents: [],
    });

    client.addCommands([command]);
    expect(client.commands.map((entry) => entry.name)).toEqual(["ping"]);
    client.addCommand({
      ...command,
      name: "pong",
      command: new SlashCommandBuilder().setName("pong").setDescription("Pong"),
    });
    expect(client.commands.map((entry) => entry.name)).toEqual(["ping", "pong"]);
    client.removeCommand("ping");
    expect(client.commands.map((entry) => entry.name)).toEqual(["pong"]);

    await client.destroy();
  });

  it("tracks and removes message roots", async () => {
    const client = new AronaDiscordClient({
      token: "token",
      clientId: "client",
      intents: [],
    });
    const root = {
      uuid: "root-1",
      unmount: async () => {},
      interactionListener: async () => {},
    };

    client.addRoot(root as never);
    expect(client.removeInteractionListener("root-1")).toBe(client);
    await client.destroy();
  });
});
