import fs from "fs-extra";
import { join } from "path";
import { fileURLToPath } from "url";
import {
  TEMPLATE_TSCONFIG,
  templatePackageJson,
  type TemplatePackageJson,
} from "./template-config";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const ROOT_DIR = join(__dirname, "..", "..", "..");
const TEMPLATES_DIR = join(__dirname, "..", "templates");
const PACKAGE_README = join(__dirname, "..", "README.md");

const IGNORED_FILES = [
  ".env",
  ".env.*",
  ".turbo",
  "node_modules",
  "dist",
  "vite.config.ts",
  "*.test.ts",
  ".git",
  ".DS_Store",
  "*.log",
];

async function getTemplateInfo(templatePath: string) {
  const packageJson = (await fs.readJson(
    join(templatePath, "package.json"),
  )) as TemplatePackageJson;
  return {
    name: packageJson.name,
    description: packageJson.description,
  };
}

async function updatePackageReadme(templates: string[]) {
  const templateInfos = await Promise.all(
    templates.map(async (template) => {
      const info = await getTemplateInfo(join(TEMPLATES_DIR, template));
      return `- \`${template}\` - ${info.description}`;
    }),
  );

  const readmeTemplate = await fs.readFile(join(__dirname, "package-readme-template.md"), "utf-8");
  await fs.writeFile(
    PACKAGE_README,
    readmeTemplate.replace("{{templatesList}}", templateInfos.join("\n")),
  );
}

async function prepareTemplate(templatePath: string) {
  const packageJsonPath = join(templatePath, "package.json");
  const packageJson = (await fs.readJson(packageJsonPath)) as TemplatePackageJson;
  await fs.writeJson(packageJsonPath, templatePackageJson(packageJson), {
    spaces: "\t",
  });
  await fs.writeJson(join(templatePath, "tsconfig.json"), TEMPLATE_TSCONFIG, {
    spaces: "\t",
  });
}

async function copyTemplates() {
  try {
    await fs.remove(TEMPLATES_DIR);
    await fs.copy(join(ROOT_DIR, "examples"), TEMPLATES_DIR, {
      filter: (src) => {
        // Keep the documented example file; never copy real env files.
        if (src.endsWith(".env.example")) return true;
        return !IGNORED_FILES.some((pattern) => {
          if (pattern.includes("*")) {
            return new RegExp(pattern.replace(".", "\\.").replace("*", ".*")).test(src);
          }
          return src.includes(pattern);
        });
      },
    });

    const templates = await fs.readdir(TEMPLATES_DIR);
    const templateContent = await fs.readFile(join(__dirname, "readme-template.md"), "utf-8");
    for (const template of templates) {
      const templatePath = join(TEMPLATES_DIR, template);
      await fs.writeFile(join(templatePath, "README.md"), templateContent);
      await prepareTemplate(templatePath);
    }

    await updatePackageReadme(templates);
    console.log("✅ Templates copied and READMEs updated successfully!");
  } catch (error) {
    console.error("❌ Failed to copy templates:", error);
    process.exit(1);
  }
}

await copyTemplates();
