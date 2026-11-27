import { describe, expect, it } from "vite-plus/test";
import { LOCAL_PACKAGE_VERSION, templatePackageJson } from "./template-config";

describe("templatePackageJson", () => {
  it("resolves catalogs and workspace packages for a standalone app", () => {
    const result = templatePackageJson({
      name: "example",
      scripts: { dev: "arona dev ./src/index.ts", test: "vp test" },
      dependencies: {
        "@arona/core": "workspace:*",
        "@arona/discord": "workspace:*",
        effect: "catalog:",
        "@effect/ui": "catalog:",
        "discord.js": "^14.19.3",
      },
      devDependencies: {
        typescript: "catalog:",
        "@types/node": "catalog:",
      },
    });

    expect(result.dependencies).toEqual({
      "@arona/core": LOCAL_PACKAGE_VERSION,
      "@arona/discord": LOCAL_PACKAGE_VERSION,
      effect: "4.1.6",
      "@effect/ui": "https://pkg.pr.new/Effect-TS/ui/@effect/ui@fb618d45fb6d",
      "discord.js": "^14.19.3",
    });
    expect(result.devDependencies).toEqual({
      typescript: "^5.8.3",
      "@types/node": "^26.6.10",
    });
    expect(result.scripts).toEqual({ dev: "arona dev ./src/index.ts" });
  });

  it("keeps concrete specs and can rename the project", () => {
    const result = templatePackageJson(
      {
        name: "old",
        dependencies: { effect: "4.0.0", local: "file:../local" },
      },
      "my-bot",
    );
    expect(result.name).toBe("my-bot");
    expect(result.dependencies).toEqual({ effect: "4.0.0", local: "file:../local" });
  });
});
