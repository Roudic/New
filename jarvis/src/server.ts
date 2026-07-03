import express from "express";
import cors from "cors";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config, assertConfig } from "./config.js";
import { JarvisAgent } from "./agent.js";
import { toolDefinitions, workspaceExists } from "./tools/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sessions = new Map<string, JarvisAgent>();

function getSession(id: string): JarvisAgent {
  if (!sessions.has(id)) {
    sessions.set(id, new JarvisAgent());
  }
  return sessions.get(id)!;
}

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

  app.get("/api/health", async (_req, res) => {
    res.json({
      ok: true,
      hasApiKey: Boolean(config.openaiApiKey),
      workspace: config.workspace,
      workspaceAccessible: await workspaceExists(),
      model: config.model,
      tools: toolDefinitions.map((t) => t.name),
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      workspace: config.workspace,
      model: config.model,
      requireApproval: config.requireApproval,
      tools: toolDefinitions.map((t) => ({
        name: t.name,
        description: t.description,
        dangerous: t.dangerous ?? false,
      })),
    });
  });

  app.post("/api/chat", async (req, res) => {
    const { message, sessionId = "default" } = req.body as {
      message?: string;
      sessionId?: string;
    };

    if (!message?.trim()) {
      res.status(400).json({ error: "message is required" });
      return;
    }

    if (!config.openaiApiKey) {
      res.status(503).json({ error: "OPENAI_API_KEY not configured" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const agent = getSession(sessionId);

    try {
      for await (const event of agent.chat(message.trim())) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
    }

    res.end();
  });

  app.post("/api/approve", async (req, res) => {
    const { toolCallId, sessionId = "default" } = req.body as {
      toolCallId?: string;
      sessionId?: string;
    };

    if (!toolCallId) {
      res.status(400).json({ error: "toolCallId is required" });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const agent = getSession(sessionId);

    try {
      for await (const event of agent.approveTool(toolCallId)) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      res.write(`data: ${JSON.stringify({ type: "error", message: msg })}\n\n`);
    }

    res.end();
  });

  app.post("/api/reset", (req, res) => {
    const { sessionId = "default" } = req.body as { sessionId?: string };
    getSession(sessionId).reset();
    res.json({ ok: true });
  });

  app.get("/api/history", (req, res) => {
    const sessionId = (req.query.sessionId as string) ?? "default";
    const agent = getSession(sessionId);
    res.json({ history: agent.getHistory() });
  });

  const webDist = join(__dirname, "..", "web", "dist");
  app.use(express.static(webDist));
  app.get("*", (_req, res) => {
    res.sendFile(join(webDist, "index.html"), (err) => {
      if (err) {
        res.status(200).send(fallbackHtml());
      }
    });
  });

  return app;
}

function fallbackHtml(): string {
  return `<!DOCTYPE html><html><head><title>JARVIS</title></head><body style="background:#0a0e17;color:#00d4ff;font-family:monospace;padding:2rem">
<h1>JARVIS API is running</h1>
<p>Build the web UI: <code>cd jarvis/web && npm install && npm run build</code></p>
<p>API: POST /api/chat with { "message": "list files in my home directory" }</p>
</body></html>`;
}

export async function startServer() {
  const app = createApp();
  app.listen(config.port, "0.0.0.0", () => {
    console.log(`
  ╔══════════════════════════════════════════╗
  ║           J.A.R.V.I.S. Online            ║
  ╠══════════════════════════════════════════╣
  ║  Web UI:  http://localhost:${config.port}           ║
  ║  API:     http://localhost:${config.port}/api/health ║
  ║  Workspace: ${config.workspace.slice(0, 28).padEnd(28)} ║
  ╚══════════════════════════════════════════╝
`);
  });
}

const isMain =
  process.argv[1]?.endsWith("server.ts") ||
  process.argv[1]?.endsWith("server.js");

if (isMain) {
  try {
    assertConfig();
  } catch (e) {
    console.warn(String(e));
    console.warn("Starting in limited mode — set OPENAI_API_KEY in .env");
  }
  startServer();
}
