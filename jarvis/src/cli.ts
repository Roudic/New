#!/usr/bin/env node
import * as readline from "node:readline";
import { assertConfig, config } from "./config.js";
import { JarvisAgent } from "./agent.js";

const args = process.argv.slice(2);
const command = args[0] ?? "chat";

async function runChat() {
  assertConfig();
  const agent = new JarvisAgent();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log(`
  ╔══════════════════════════════════════════╗
  ║     J.A.R.V.I.S. — Command Interface     ║
  ╠══════════════════════════════════════════╣
  ║  Workspace: ${config.workspace.slice(0, 28).padEnd(28)} ║
  ║  Type 'exit' or Ctrl+C to quit           ║
  ╚══════════════════════════════════════════╝
`);

  const prompt = () => {
    rl.question("\n\x1b[36mYou:\x1b[0m ", async (input) => {
      const trimmed = input.trim();
      if (!trimmed || trimmed === "exit") {
        console.log("\nGoodbye, sir.");
        rl.close();
        return;
      }

      process.stdout.write("\n\x1b[33mJARVIS:\x1b[0m ");
      try {
        for await (const event of agent.chat(trimmed)) {
          if (event.type === "text_delta") {
            process.stdout.write(event.content);
          } else if (event.type === "tool_call") {
            console.log(`\n  \x1b[90m[tool: ${event.name}]\x1b[0m`);
          } else if (event.type === "tool_result") {
            if (!event.result.success) {
              console.log(`  \x1b[31m[error: ${event.result.error}]\x1b[0m`);
            }
          }
        }
      } catch (err) {
        console.error("\n\x1b[31mError:", err instanceof Error ? err.message : err, "\x1b[0m");
      }

      prompt();
    });
  };

  prompt();
}

async function runServer() {
  const { startServer } = await import("./server.js");
  try {
    assertConfig();
  } catch (e) {
    console.warn(String(e));
  }
  await startServer();
}

switch (command) {
  case "chat":
    runChat().catch(console.error);
    break;
  case "serve":
  case "server":
    runServer().catch(console.error);
    break;
  default:
    console.log(`Usage: jarvis [chat|serve]
  chat   — interactive terminal chat
  serve  — start web UI + API server`);
}
