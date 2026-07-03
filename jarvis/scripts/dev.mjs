#!/usr/bin/env node
import { execSync, spawn } from "node:child_process";
import { existsSync, copyFileSync } from "node:fs";
import { createServer } from "node:net";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const webDist = join(root, "web", "dist", "index.html");
const envFile = join(root, ".env");
const envExample = join(root, ".env.example");

console.log("\n  JARVIS startup check...\n");

if (!existsSync(envFile) && existsSync(envExample)) {
  copyFileSync(envExample, envFile);
  console.log("  Created .env from .env.example — add your OPENAI_API_KEY!\n");
}

if (!existsSync(webDist)) {
  console.log("  Building web UI (first run)...\n");
  execSync("npm run build:web", { cwd: root, stdio: "inherit" });
}

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "0.0.0.0");
  });
}

async function findPort(start = 3001) {
  for (let p = start; p < start + 10; p++) {
    if (await isPortFree(p)) return p;
  }
  throw new Error(`No free port found between ${start} and ${start + 9}`);
}

function openBrowser(url) {
  const cmd =
    platform() === "darwin" ? "open" : platform() === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, platform() === "win32" ? [url] : [url], {
      detached: true,
      stdio: "ignore",
    }).unref();
  } catch {
    console.log(`  Could not auto-open browser. Open manually: ${url}\n`);
  }
}

async function waitForServer(url, attempts = 40) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error("Server did not start in time");
}

const requestedPort = parseInt(process.env.PORT ?? "3001", 10);
const port = await findPort(requestedPort);
const url = `http://localhost:${port}`;

if (port !== requestedPort) {
  console.log(`  Port ${requestedPort} is busy — using ${port} instead.\n`);
}

console.log(`  Starting JARVIS on ${url} ...\n`);

const child = spawn("npx", ["tsx", "watch", "src/server.ts"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
});

try {
  await waitForServer(`${url}/api/health`);
  console.log(`\n  ✓ JARVIS is ready — open ${url}\n`);
  openBrowser(url);
} catch {
  console.log(`\n  Server is starting... open ${url} in your browser.\n`);
}

child.on("exit", (code) => process.exit(code ?? 0));
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
