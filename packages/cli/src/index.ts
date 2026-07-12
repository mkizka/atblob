#!/usr/bin/env node

import { doRunCli } from "./cli.js";

process.exitCode = await doRunCli(process.argv.slice(2), process.env);
