export const CATALOG_VERSIONS: Readonly<Record<string, string>> = {
  effect: "4.1.6",
  "@effect/ui": "https://pkg.pr.new/Effect-TS/ui/@effect/ui@fb618d45fb6d",
  typescript: "^5.8.3",
  "@types/node": "^26.6.10",
  "vite-plus": "1.8.0",
};

export const LOCAL_PACKAGE_VERSION = "dev";

export const TEMPLATE_TSCONFIG = {
  compilerOptions: {
    lib: ["ESNext"],
    target: "ESNext",
    module: "ESNext",
    moduleDetection: "force",
    moduleResolution: "bundler",
    allowImportingTsExtensions: true,
    verbatimModuleSyntax: true,
    noEmit: true,
    strict: true,
    exactOptionalPropertyTypes: true,
    skipLibCheck: true,
    noFallthroughCasesInSwitch: true,
    noUncheckedIndexedAccess: true,
  },
  include: ["src/**/*"],
} as const;

type DependencyMap = Record<string, string>;

export interface TemplatePackageJson {
  name?: string | undefined;
  description?: string | undefined;
  version?: string | undefined;
  private?: boolean | undefined;
  type?: string | undefined;
  module?: string | undefined;
  scripts?: Record<string, string> | undefined;
  dependencies?: DependencyMap | undefined;
  devDependencies?: DependencyMap | undefined;
  peerDependencies?: DependencyMap | undefined;
  [key: string]: unknown;
}

/** Resolves workspace-only specs so a scaffolded app can be installed alone. */
export const templatePackageJson = (
  packageJson: TemplatePackageJson,
  projectName?: string,
): TemplatePackageJson => {
  const rewrite = (dependencies: DependencyMap | undefined) => {
    if (!dependencies) return undefined;
    const out: DependencyMap = {};
    for (const [name, spec] of Object.entries(dependencies)) {
      if (spec === "workspace:*" || spec.startsWith("workspace:")) {
        out[name] = LOCAL_PACKAGE_VERSION;
      } else if (spec === "catalog:") {
        out[name] = CATALOG_VERSIONS[name] ?? spec;
      } else {
        out[name] = spec;
      }
    }
    return out;
  };

  const scripts = { ...packageJson.scripts };
  delete scripts.test;

  const result: TemplatePackageJson = {
    ...packageJson,
    scripts,
    dependencies: rewrite(packageJson.dependencies),
    devDependencies: rewrite(packageJson.devDependencies),
  };
  if (projectName) result.name = projectName;
  if (packageJson.peerDependencies) {
    result.peerDependencies = rewrite(packageJson.peerDependencies);
  }
  return result;
};
