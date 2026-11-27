import path from "node:path";
import { describe, expect, it, vi } from "vite-plus/test";
import { parseArgs, run } from "./index";

describe("parseArgs", () => {
  it("parses dev and build entries relative to the cwd", () => {
    const cwd = process.cwd();
    expect(parseArgs(["node", "arona", "dev", "./src/index.ts"])).toEqual({
      _tag: "Dev",
      entry: path.resolve(cwd, "./src/index.ts"),
    });
    expect(parseArgs(["node", "arona", "build", "src/index.ts"])).toEqual({
      _tag: "Build",
      entry: path.resolve(cwd, "src/index.ts"),
    });
  });

  it("shows help with no command or help", () => {
    expect(parseArgs(["node", "arona"])._tag).toBe("Help");
    expect(parseArgs(["node", "arona", "help"])._tag).toBe("Help");
  });

  it("reports a missing entry point", () => {
    const result = parseArgs(["node", "arona", "dev"]);
    expect(result._tag).toBe("Error");
    if (result._tag === "Error") expect(result.message).toContain("entry point");
  });

  it("reports unknown commands", () => {
    const result = parseArgs(["node", "arona", "wat"]);
    expect(result._tag).toBe("Error");
    if (result._tag === "Error") expect(result.message).toContain("Unknown command: wat");
  });
});

describe("run", () => {
  it("runs the build command with the resolved entry", async () => {
    const build = vi.fn(async () => {});
    const exit = vi.fn();
    await run(["node", "arona", "build", "src/index.ts"], { build, exit });
    expect(build).toHaveBeenCalledWith(path.resolve(process.cwd(), "src/index.ts"));
    expect(exit).not.toHaveBeenCalled();
  });

  it("runs the dev command with the resolved entry", async () => {
    const dev = vi.fn(async () => null);
    await run(["node", "arona", "dev", "src/index.ts"], { dev });
    expect(dev).toHaveBeenCalledWith(path.resolve(process.cwd(), "src/index.ts"));
  });

  it("logs usage for help", async () => {
    const log = vi.fn();
    await run(["node", "arona", "help"], { log });
    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0]?.[0])).toContain("Usage: arona");
  });

  it("exits on errors", async () => {
    const error = vi.fn();
    const exit = vi.fn();
    await run(["node", "arona", "wat"], { error, exit });
    expect(exit).toHaveBeenCalledWith(1);
    expect(error).toHaveBeenCalledOnce();
  });
});
