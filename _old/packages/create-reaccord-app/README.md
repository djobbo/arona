# create-reaccord-app

## Scaffolding for Reaccord projects

```bash
# npm
npm create reaccord@latest

# yarn
yarn create reaccord@latest

# pnpm
pnpm create reaccord@latest

#bun
bun create reaccord@latest
```

`create-reaccord-app` automatically runs in _interactive_ mode, but you can also specify your project name and template with command line arguments.

```bash
# npm
npm create reaccord@latest my-reaccord-bot -- --template simple-counter

# yarn
yarn create reaccord@latest my-reaccord-bot --template simple-counter

# pnpm
pnpm create reaccord@latest my-reaccord-bot --template simple-counter

# bun
bun create reaccord@latest my-reaccord-bot --template simple-counter
```

[Check out the full list][examples] of example templates, available on GitHub.

You can also use any GitHub repo as a template:

```bash
npm create reaccord@latest my-reaccord-bot -- --template djobbo/reaccord-template
```

### CLI Flags

May be provided in place of prompts

| Name                         | Description                                            |
| :--------------------------- | :----------------------------------------------------- |
| `--help` (`-h`)              | Display available flags.                               |
| `--template <name>`          | Specify your template.                                 |
| `--install` / `--no-install` | Install dependencies (or not).                         |
| `--git` / `--no-git`         | Initialize git repo (or not).                          |
| `--yes` (`-y`)               | Skip all prompts by accepting defaults.                |
| `--no` (`-n`)                | Skip all prompts by declining defaults.                |
| `--dry-run`                  | Walk through steps without executing.                  |
| `--ref`                      | Specify an Astro branch (default: latest).             |

[examples]: https://github.com/djobbo/reaccord/tree/master/examples