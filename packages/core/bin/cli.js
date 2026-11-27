#!/usr/bin/env node

import { run } from "@arona/core/cli";

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
