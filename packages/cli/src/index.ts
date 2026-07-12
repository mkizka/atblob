#!/usr/bin/env node

import { runCliEntrypoint } from "./cli.js";

process.exitCode = await runCliEntrypoint(process.argv.slice(2), process.env);
