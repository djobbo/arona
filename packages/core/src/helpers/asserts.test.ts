import { describe, expect, it } from "vite-plus/test";
import { assertIsDefined } from "./asserts";

describe("assertIsDefined", () => {
  it("keeps defined values", () => {
    const value: string | undefined = "value";
    assertIsDefined(value);
    expect(value.toUpperCase()).toBe("VALUE");
  });

  it("throws with the default message", () => {
    expect(() => assertIsDefined(undefined)).toThrow("Unexpected undefined value");
  });

  it("throws with a custom message", () => {
    expect(() => assertIsDefined(undefined, "missing entry")).toThrow("missing entry");
  });
});
