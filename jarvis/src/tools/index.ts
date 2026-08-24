import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import {
  access,
  mkdir,
  readdir,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { constants } from "node:fs";
import { homedir, platform, release, totalmem, freemem, cpus, arch, hostname } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { config } from "../config.js";

const execFileAsync = promisify(execFile);

export type ToolDefinition = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  dangerous?: boolean;
};

export type ToolResult = {
  success: boolean;
  output: string;
  error?: string;
};

function resolveSafePath(inputPath: string): string {
  const base = config.workspace;
  const resolved = resolve(base, inputPath.replace(/^~/, homedir()));
  const rel = relative(base, resolved);
  if (rel.startsWith("..") || rel.includes(`..${sep}`)) {
    throw new Error(`Path "${inputPath}" is outside the allowed workspace (${base})`);
  }
  return resolved;
}

export const toolDefinitions: ToolDefinition[] = [
  {
    name: "list_directory",
    description: "List files and folders in a directory. Returns name, type, and size.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path (relative to workspace or absolute within workspace)" },
      },
      required: ["path"],
    },
  },
  {
    name: "read_file",
    description: "Read the contents of a text file. Use for code, configs, logs, etc.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        max_lines: { type: "number", description: "Max lines to return (default 500)" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a text file.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "File path" },
        content: { type: "string", description: "File content" },
      },
      required: ["path", "content"],
    },
    dangerous: true,
  },
  {
    name: "delete_path",
    description: "Delete a file or empty directory.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to delete" },
      },
      required: ["path"],
    },
    dangerous: true,
  },
  {
    name: "search_files",
    description: "Search for files by name pattern (glob-like with * wildcard) within a directory tree.",
    parameters: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory to search in" },
        pattern: { type: "string", description: "Filename pattern, e.g. *.ts or package.json" },
        max_results: { type: "number", description: "Max results (default 50)" },
      },
      required: ["directory", "pattern"],
    },
  },
  {
    name: "grep_files",
    description: "Search for text content inside files in a directory.",
    parameters: {
      type: "object",
      properties: {
        directory: { type: "string", description: "Directory to search" },
        query: { type: "string", description: "Text to search for" },
        file_extension: { type: "string", description: "Optional extension filter, e.g. .ts" },
        max_results: { type: "number", description: "Max matches (default 30)" },
      },
      required: ["directory", "query"],
    },
  },
  {
    name: "run_command",
    description: "Run a shell command and return stdout/stderr. Use for git, npm, system utilities, etc.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Shell command to execute" },
        cwd: { type: "string", description: "Working directory (defaults to workspace)" },
      },
      required: ["command"],
    },
    dangerous: true,
  },
  {
    name: "get_system_info",
    description: "Get OS, CPU, memory, and hostname information about the computer.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "open_url",
    description: "Open a URL in the default web browser.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to open (must start with http:// or https://)" },
      },
      required: ["url"],
    },
  },
  {
    name: "create_directory",
    description: "Create a directory (and parent directories if needed).",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Directory path to create" },
      },
      required: ["path"],
    },
  },
];

function matchPattern(name: string, pattern: string): boolean {
  const regex = new RegExp(
    "^" + pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$",
    "i"
  );
  return regex.test(name);
}

async function walkDir(dir: string, maxDepth = 8): Promise<string[]> {
  const results: string[] = [];
  async function walk(current: string, depth: number) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".env") continue;
      const full = join(current, entry.name);
      results.push(full);
      if (entry.isDirectory()) await walk(full, depth + 1);
    }
  }
  await walk(dir, 0);
  return results;
}

async function listDirectory(args: { path: string }): Promise<ToolResult> {
  const target = resolveSafePath(args.path);
  const entries = await readdir(target, { withFileTypes: true });
  const lines = await Promise.all(
    entries.map(async (e) => {
      const full = join(target, e.name);
      const type = e.isDirectory() ? "dir" : "file";
      let size = "";
      if (e.isFile()) {
        const s = await stat(full);
        size = ` (${s.size} bytes)`;
      }
      return `${type}\t${e.name}${size}`;
    })
  );
  return { success: true, output: lines.sort().join("\n") || "(empty directory)" };
}

async function readFileTool(args: { path: string; max_lines?: number }): Promise<ToolResult> {
  const target = resolveSafePath(args.path);
  const content = await readFile(target, "utf-8");
  const maxLines = args.max_lines ?? 500;
  const lines = content.split("\n");
  const truncated = lines.length > maxLines;
  const output = (truncated ? lines.slice(0, maxLines) : lines).join("\n");
  const suffix = truncated ? `\n\n... truncated (${lines.length - maxLines} more lines)` : "";
  return { success: true, output: output + suffix };
}

async function writeFileTool(args: { path: string; content: string }): Promise<ToolResult> {
  const target = resolveSafePath(args.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, args.content, "utf-8");
  return { success: true, output: `Wrote ${args.content.length} bytes to ${target}` };
}

async function deletePath(args: { path: string }): Promise<ToolResult> {
  const target = resolveSafePath(args.path);
  await rm(target, { recursive: true, force: true });
  return { success: true, output: `Deleted ${target}` };
}

async function searchFiles(args: {
  directory: string;
  pattern: string;
  max_results?: number;
}): Promise<ToolResult> {
  const dir = resolveSafePath(args.directory);
  const max = args.max_results ?? 50;
  const all = await walkDir(dir);
  const base = config.workspace;
  const matches = all
    .filter((p) => matchPattern(p.split(sep).pop() ?? "", args.pattern))
    .slice(0, max)
    .map((p) => relative(base, p));
  return {
    success: true,
    output: matches.length ? matches.join("\n") : "No matches found.",
  };
}

async function grepFiles(args: {
  directory: string;
  query: string;
  file_extension?: string;
  max_results?: number;
}): Promise<ToolResult> {
  const dir = resolveSafePath(args.directory);
  const max = args.max_results ?? 30;
  const all = await walkDir(dir);
  const matches: string[] = [];
  for (const file of all) {
    if (args.file_extension && !file.endsWith(args.file_extension)) continue;
    try {
      const s = await stat(file);
      if (!s.isFile() || s.size > 512_000) continue;
      const content = await readFile(file, "utf-8");
      const lines = content.split("\n");
      lines.forEach((line, i) => {
        if (line.includes(args.query) && matches.length < max) {
          matches.push(`${relative(config.workspace, file)}:${i + 1}: ${line.trim()}`);
        }
      });
    } catch {
      /* skip binary/unreadable */
    }
  }
  return {
    success: true,
    output: matches.length ? matches.join("\n") : "No matches found.",
  };
}

async function runCommand(args: { command: string; cwd?: string }): Promise<ToolResult> {
  const cwd = args.cwd ? resolveSafePath(args.cwd) : config.workspace;
  const shell = platform() === "win32" ? "cmd.exe" : "/bin/bash";
  const shellArgs = platform() === "win32" ? ["/c", args.command] : ["-lc", args.command];

  return new Promise((resolvePromise) => {
    const child = spawn(shell, shellArgs, { cwd, env: process.env });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      resolvePromise({
        success: false,
        output: stdout,
        error: `Command timed out after ${config.shellTimeoutMs}ms`,
      });
    }, config.shellTimeoutMs);

    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => {
      clearTimeout(timer);
      const output = [stdout, stderr].filter(Boolean).join("\n").trim() || "(no output)";
      resolvePromise({
        success: code === 0,
        output: output.slice(0, 16_000),
        error: code !== 0 ? `Exit code ${code}` : undefined,
      });
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      resolvePromise({ success: false, output: "", error: err.message });
    });
  });
}

async function getSystemInfo(): Promise<ToolResult> {
  const cpuList = cpus();
  const info = {
    hostname: hostname(),
    platform: platform(),
    release: release(),
    arch: arch(),
    cpus: cpuList.length,
    cpuModel: cpuList[0]?.model,
    totalMemoryGB: (totalmem() / 1e9).toFixed(2),
    freeMemoryGB: (freemem() / 1e9).toFixed(2),
    workspace: config.workspace,
    cwd: process.cwd(),
  };
  return { success: true, output: JSON.stringify(info, null, 2) };
}

async function openUrl(args: { url: string }): Promise<ToolResult> {
  const url = args.url.trim();
  if (!/^https?:\/\//i.test(url)) {
    return { success: false, output: "", error: "URL must start with http:// or https://" };
  }
  const cmd =
    platform() === "darwin"
      ? "open"
      : platform() === "win32"
        ? "start"
        : "xdg-open";
  await execFileAsync(cmd, platform() === "win32" ? [url] : [url]);
  return { success: true, output: `Opened ${url} in default browser` };
}

async function createDirectory(args: { path: string }): Promise<ToolResult> {
  const target = resolveSafePath(args.path);
  await mkdir(target, { recursive: true });
  return { success: true, output: `Created directory ${target}` };
}

export function isDangerousTool(name: string): boolean {
  return toolDefinitions.find((t) => t.name === name)?.dangerous ?? false;
}

export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  try {
    switch (name) {
      case "list_directory":
        return await listDirectory(args as { path: string });
      case "read_file":
        return await readFileTool(args as { path: string; max_lines?: number });
      case "write_file":
        return await writeFileTool(args as { path: string; content: string });
      case "delete_path":
        return await deletePath(args as { path: string });
      case "search_files":
        return await searchFiles(
          args as { directory: string; pattern: string; max_results?: number }
        );
      case "grep_files":
        return await grepFiles(
          args as {
            directory: string;
            query: string;
            file_extension?: string;
            max_results?: number;
          }
        );
      case "run_command":
        return await runCommand(args as { command: string; cwd?: string });
      case "get_system_info":
        return await getSystemInfo();
      case "open_url":
        return await openUrl(args as { url: string });
      case "create_directory":
        return await createDirectory(args as { path: string });
      default:
        return { success: false, output: "", error: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, output: "", error: message };
  }
}

export async function workspaceExists(): Promise<boolean> {
  try {
    await access(config.workspace, constants.R_OK);
    return true;
  } catch {
    return false;
  }
}
