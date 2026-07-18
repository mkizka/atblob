#!/usr/bin/env node

import { runCli } from "./cli.js";

try {
  await runCli(process.argv.slice(2), process.env);
} catch (error) {
  console.error("Error:", error instanceof Error ? error.message : error);
  process.exit(1);
}
