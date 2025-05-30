import fs from 'fs-extra';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT_DIR = join(__dirname, '..', '..', '..');
const TEMPLATES_DIR = join(__dirname, '..', 'templates');
const PACKAGE_README = join(__dirname, '..', 'README.md');

const IGNORED_FILES = [
  '.env',
  '.env.*',
  'node_modules',
  'dist',
  '.git',
  '.DS_Store',
  '*.log'
];

async function getTemplateInfo(templatePath: string) {
  const packageJsonPath = join(templatePath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  return {
    name: packageJson.name,
    description: packageJson.description
  };
}

async function updatePackageReadme(templates: string[]) {
  const templateInfos = await Promise.all(
    templates.map(async template => {
      const templatePath = join(TEMPLATES_DIR, template);
      const info = await getTemplateInfo(templatePath);
      return `- \`${template}\` - ${info.description}`;
    })
  );

  const templateList = templateInfos.join('\n');
  const readmeTemplate = await fs.readFile(join(__dirname, 'package-readme-template.md'), 'utf-8');
  const updatedReadme = readmeTemplate.replace('{{templatesList}}', templateList);
  await fs.writeFile(PACKAGE_README, updatedReadme);
}

async function updateTemplatePackageJson(templatePath: string) {
  const packageJsonPath = join(templatePath, 'package.json');
  const packageJson = await fs.readJson(packageJsonPath);
  
  if (packageJson.dependencies && packageJson.dependencies['@arona/discord']) {
    packageJson.dependencies['@arona/discord'] = '0.0.0-dev';
    await fs.writeJson(packageJsonPath, packageJson, { spaces: '\t' });
  }
}

async function copyTemplates() {
  try {
    // Remove existing templates directory
    await fs.remove(TEMPLATES_DIR);

    // Copy examples directory
    await fs.copy(join(ROOT_DIR, 'examples'), TEMPLATES_DIR, {
      filter: (src) => {
        // Skip ignored files
        return !IGNORED_FILES.some(pattern => {
          if (pattern.includes('*')) {
            const regex = new RegExp(pattern.replace('*', '.*'));
            return regex.test(src);
          }
          return src.includes(pattern);
        });
      }
    });

    // Add README file to each template
    const templates = await fs.readdir(TEMPLATES_DIR);
    const templateContent = await fs.readFile(join(__dirname, 'readme-template.md'), 'utf-8');
    for (const template of templates) {
      const templatePath = join(TEMPLATES_DIR, template);
      const readmePath = join(templatePath, 'README.md');
      await fs.writeFile(readmePath, templateContent);
      await updateTemplatePackageJson(templatePath);
    }

    // Update package README with available templates
    await updatePackageReadme(templates);

    console.log('✅ Templates copied and READMEs updated successfully!');
  } catch (error) {
    console.error('❌ Failed to copy templates:', error);
    process.exit(1);
  }
}

copyTemplates();
