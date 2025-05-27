#!/usr/bin/env node

import { program } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const TEMPLATES = {
  default: 'Default template with basic setup',
  'rick-and-morty': 'Rick and Morty example with API integration'
};

const PACKAGE_MANAGERS = {
  npm: {
    install: 'npm install',
    dev: 'npm run dev'
  },
  yarn: {
    install: 'yarn',
    dev: 'yarn dev'
  },
  pnpm: {
    install: 'pnpm install',
    dev: 'pnpm dev'
  },
  bun: {
    install: 'bun install',
    dev: 'bun dev'
  }
};

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent || '';
  if (userAgent.includes('yarn')) return 'yarn';
  if (userAgent.includes('pnpm')) return 'pnpm';
  if (userAgent.includes('bun')) return 'bun';
  return 'npm';
}

async function processReadme(content, projectName, packageManager) {
  const pm = PACKAGE_MANAGERS[packageManager];
  return content
    .replace(/{{projectName}}/g, projectName)
    .replace(/{{installCommand}}/g, pm.install)
    .replace(/{{devCommand}}/g, pm.dev);
}

async function createApp() {
  console.log(chalk.blue('✨ Welcome to create-arona-app! ✨\n'));

  const { projectName } = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectName',
      message: 'What is your project named?',
      default: 'my-arona-app',
      validate: (input) => {
        if (!input) return 'Project name is required';
        if (fs.existsSync(input)) return 'Directory already exists';
        return true;
      }
    }
  ]);

  const { template } = await inquirer.prompt([
    {
      type: 'list',
      name: 'template',
      message: 'Which template would you like to use?',
      choices: Object.entries(TEMPLATES).map(([key, description]) => ({
        name: `${key} - ${description}`,
        value: key
      }))
    }
  ]);

  const detectedPM = detectPackageManager();
  const { packageManager } = await inquirer.prompt([
    {
      type: 'list',
      name: 'packageManager',
      message: 'Which package manager would you like to use?',
      default: detectedPM,
      choices: Object.keys(PACKAGE_MANAGERS).map(pm => ({
        name: pm,
        value: pm
      }))
    }
  ]);

  const spinner = ora('Creating your Arona app...').start();

  try {
    // Create project directory
    await fs.mkdir(projectName);
    
    // Copy template files from the local templates directory
    const templatePath = path.join(__dirname, '..', 'templates', template);
    await fs.copy(templatePath, projectName);

    // Update package.json with project name
    const packageJsonPath = path.join(projectName, 'package.json');
    const packageJson = await fs.readJson(packageJsonPath);
    packageJson.name = projectName;
    await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });

    // Process README
    const readmePath = path.join(projectName, 'README.md');
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    const processedReadme = await processReadme(readmeContent, projectName, packageManager);
    await fs.writeFile(readmePath, processedReadme);

    spinner.succeed(chalk.green('Project created successfully!'));

    const pm = PACKAGE_MANAGERS[packageManager];
    console.log('\nNext steps:');
    console.log(chalk.cyan(`  cd ${projectName}`));
    console.log(chalk.cyan(`  ${pm.install}`));
    console.log(chalk.cyan(`  ${pm.dev}`));
    console.log('\nHappy coding! 🚀');

  } catch (error) {
    spinner.fail(chalk.red('Failed to create project'));
    console.error(error);
    process.exit(1);
  }
}

program
  .name('create-arona-app')
  .description('Create a new Arona app with a single command')
  .action(createApp);

program.parse(); 
