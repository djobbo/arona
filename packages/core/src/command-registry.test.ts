import { describe, expect, it } from "vite-plus/test";
import { CommandRegistry } from "./command-registry";

interface Command {
  readonly name: string;
  readonly value?: number;
}

describe("CommandRegistry", () => {
  it("starts empty", () => {
    const registry = new CommandRegistry<Command>();
    expect(registry.size).toBe(0);
    expect(registry.list()).toEqual([]);
  });

  it("adds commands and replaces one with the same name", () => {
    const registry = new CommandRegistry<Command>();
    registry.add({ name: "ping", value: 1 });
    registry.add({ name: "pong", value: 2 });
    registry.add({ name: "ping", value: 3 });

    expect(registry.size).toBe(2);
    expect(registry.get("ping")).toEqual({ name: "ping", value: 3 });
    expect(registry.has("pong")).toBe(true);
  });

  it("adds many commands", () => {
    const registry = new CommandRegistry<Command>().addAll([{ name: "a" }, { name: "b" }]);

    expect(registry.names()).toEqual(["a", "b"]);
    expect([...registry]).toHaveLength(2);
  });

  it("removes and clears commands", () => {
    const registry = new CommandRegistry<Command>().addAll([{ name: "a" }, { name: "b" }]);

    expect(registry.remove("a")).toBe(true);
    expect(registry.remove("missing")).toBe(false);
    expect(registry.names()).toEqual(["b"]);

    registry.clear();
    expect(registry.size).toBe(0);
  });
});
