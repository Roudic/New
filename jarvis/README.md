# J.A.R.V.I.S. — AI Computer Control

A JARVIS-like AI assistant that can control your computer through natural language. It manages files, runs shell commands, inspects system info, opens URLs, and more — with a sleek Iron Man-inspired web interface and CLI.

```
  ╔══════════════════════════════════════════╗
  ║           J.A.R.V.I.S. Online            ║
  ╠══════════════════════════════════════════╣
  ║  "Just A Rather Very Intelligent System" ║
  ╚══════════════════════════════════════════╝
```

## Features

- **Natural language control** — ask JARVIS to do things in plain English
- **File system tools** — list, read, write, search, grep, delete files
- **Shell commands** — run git, npm, or any terminal command
- **System info** — CPU, memory, OS, hostname
- **Open URLs** — launch links in your default browser
- **Safety guardrails** — dangerous actions require approval by default
- **Web UI** — dark JARVIS-themed chat with voice input/output
- **CLI mode** — terminal chat for power users
- **Local LLM support** — works with Ollama, LM Studio via OpenAI-compatible API

## Quick Start

### 1. Install

```bash
cd jarvis
npm install
cp .env.example .env
```

### 2. Configure

Edit `.env`:

```env
OPENAI_API_KEY=sk-your-key-here
JARVIS_WORKSPACE=/Users/yourname    # directory JARVIS can access
PORT=3001
```

For **local models** (Ollama):

```env
OPENAI_API_KEY=ollama
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_MODEL=llama3.2
```

### 3. Run

**Web UI + API server:**

```bash
npm run dev
```

Open http://localhost:3001

**CLI chat:**

```bash
npm run cli
```

## Example Commands

| You say | JARVIS does |
|---------|-------------|
| "List files in my Documents folder" | Lists directory contents |
| "Find all TypeScript files containing 'useState'" | Greps your workspace |
| "What's my CPU and memory usage?" | Returns system info |
| "Create a file called notes.txt with my shopping list" | Writes a file |
| "Run git status in my project" | Executes shell command |
| "Open github.com" | Opens URL in browser |

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Web UI /   │────▶│  Express API │────▶│  OpenAI / Local │
│  CLI Chat   │ SSE │  + Sessions  │     │  LLM            │
└─────────────┘     └──────┬───────┘     └─────────────────┘
                           │
                    ┌──────▼───────┐
                    │  Tool Engine │
                    ├──────────────┤
                    │ list/read/   │
                    │ write files  │
                    │ run_command  │
                    │ system_info  │
                    │ open_url     │
                    └──────────────┘
```

## Safety

- **Workspace sandbox** — JARVIS can only access files inside `JARVIS_WORKSPACE` (defaults to your home directory)
- **Approval mode** — destructive tools (`write_file`, `delete_path`, `run_command`) require user approval when `JARVIS_REQUIRE_APPROVAL=true`
- **Command timeout** — shell commands timeout after 30 seconds
- **Output limits** — large file reads and command output are truncated

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/config` | GET | Workspace, model, tools |
| `/api/chat` | POST | Stream chat (SSE) — `{ "message": "..." }` |
| `/api/reset` | POST | Clear conversation |
| `/api/approve` | POST | Approve a pending dangerous action |

## Development

```bash
# Backend with hot reload
npm run dev

# Web UI dev server (proxies API)
cd web && npm run dev

# Production build
npm run build
npm start
```

## Requirements

- Node.js 18+
- OpenAI API key (or compatible local LLM)
- macOS, Linux, or Windows

## License

MIT
