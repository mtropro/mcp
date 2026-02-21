#!/usr/bin/env node
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

// Change to mcp directory so ESM resolution works
const __dirname = dirname(fileURLToPath(import.meta.url));
process.chdir(__dirname);

// Now import the actual server
await import("./dist/index.js");
