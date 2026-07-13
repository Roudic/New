#!/usr/bin/env node
import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDist = join(root, "web", "dist", "index.html");

if (!existsSync(webDist)) {
  console.log("Building JARVIS web UI...");
  execSync("npm run build:web", { cwd: root, stdio: "inherit" });
}
