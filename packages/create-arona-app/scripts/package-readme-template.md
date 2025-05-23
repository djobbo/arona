# create-arona-app

Create a new Arona app with a single command.

## Usage

```bash
# Using bun
bun create arona-app my-app

# Using npm
npm create arona-app my-app

# Using yarn
yarn create arona-app my-app

# Using pnpm
pnpm create arona-app my-app
```

## Templates

The following templates are available:

{{templatesList}}

## Features

- Interactive CLI with project name validation
- Template selection
- Package manager selection (npm, yarn, pnpm, bun)
- Automatic package.json configuration
- Clear next steps instructions

## Development

To work on this package locally:

1. Clone the repository
2. Install dependencies:
   ```bash
   bun install
   # or
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```
3. Link the package:
   ```bash
   npm link
   ```
4. Test the package:
   ```bash
   create-arona-app my-test-app
   ``` 