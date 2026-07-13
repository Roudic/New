import OpenAI from "openai";
import { config } from "./config.js";
import {
  executeTool,
  isDangerousTool,
  toolDefinitions,
  type ToolResult,
} from "./tools/index.js";

export type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

export type ToolCallEvent = {
  type: "tool_call";
  name: string;
  args: Record<string, unknown>;
  dangerous: boolean;
};

export type ToolResultEvent = {
  type: "tool_result";
  name: string;
  result: ToolResult;
};

export type TextDeltaEvent = {
  type: "text_delta";
  content: string;
};

export type AgentEvent = ToolCallEvent | ToolResultEvent | TextDeltaEvent | { type: "done" };

const SYSTEM_PROMPT = `You are JARVIS — a sophisticated AI assistant that controls the user's computer.

You have tools to manage files, run commands, inspect the system, and open URLs. The user's allowed workspace is: ${config.workspace}

Guidelines:
- Be concise, helpful, and proactive. Address the user respectfully (e.g., "Sir" or by name if known).
- Before destructive actions (delete, overwrite, shell commands), briefly explain what you'll do.
- Prefer read-only operations first when exploring.
- When running commands, show relevant output — don't dump huge logs unless asked.
- If a task needs multiple steps, execute them without asking for permission on each safe step.
- For dangerous operations, the system may require user approval — explain clearly if blocked.
- You cannot access paths outside the configured workspace.
- Current date: ${new Date().toISOString().split("T")[0]}`;

function toOpenAiTools() {
  return toolDefinitions.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

export type PendingApproval = {
  id: string;
  name: string;
  args: Record<string, unknown>;
};

export class JarvisAgent {
  private client: OpenAI;
  private history: OpenAI.Chat.ChatCompletionMessageParam[] = [];
  private pendingApprovals = new Map<string, PendingApproval>();

  constructor() {
    this.client = new OpenAI({
      apiKey: config.openaiApiKey,
      baseURL: config.openaiBaseUrl,
    });
    this.history.push({ role: "system", content: SYSTEM_PROMPT });
  }

  reset(): void {
    this.history = [{ role: "system", content: SYSTEM_PROMPT }];
    this.pendingApprovals.clear();
  }

  getHistory(): ChatMessage[] {
    return this.history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
      }));
  }

  async *chat(
    userMessage: string,
    approvedToolIds?: string[]
  ): AsyncGenerator<AgentEvent> {
    this.history.push({ role: "user", content: userMessage });

    let iterations = 0;
    while (iterations < config.maxToolIterations) {
      iterations++;

      const stream = await this.client.chat.completions.create({
        model: config.model,
        messages: this.history,
        tools: toOpenAiTools(),
        stream: true,
      });

      let assistantContent = "";
      const toolCalls: Map<
        number,
        { id: string; name: string; arguments: string }
      > = new Map();

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        if (delta.content) {
          assistantContent += delta.content;
          yield { type: "text_delta", content: delta.content };
        }

        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index ?? 0;
            if (!toolCalls.has(idx)) {
              toolCalls.set(idx, {
                id: tc.id ?? `call_${idx}`,
                name: tc.function?.name ?? "",
                arguments: "",
              });
            }
            const existing = toolCalls.get(idx)!;
            if (tc.function?.name) existing.name = tc.function.name;
            if (tc.function?.arguments) existing.arguments += tc.function.arguments;
          }
        }
      }

      if (toolCalls.size === 0) {
        this.history.push({ role: "assistant", content: assistantContent });
        yield { type: "done" };
        return;
      }

      const assistantToolCalls: OpenAI.Chat.ChatCompletionMessageToolCall[] = [];
      for (const [, tc] of toolCalls) {
        assistantToolCalls.push({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        });
      }

      this.history.push({
        role: "assistant",
        content: assistantContent || null,
        tool_calls: assistantToolCalls,
      });

      for (const tc of assistantToolCalls) {
        const name = tc.function.name;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(tc.function.arguments || "{}");
        } catch {
          args = {};
        }

        const dangerous = isDangerousTool(name);
        yield { type: "tool_call", name, args, dangerous };

        if (config.requireApproval && dangerous && !approvedToolIds?.includes(tc.id)) {
          this.pendingApprovals.set(tc.id, { id: tc.id, name, args });
          this.history.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify({
              success: false,
              error: "Awaiting user approval for this action.",
            }),
          });
          yield {
            type: "tool_result",
            name,
            result: {
              success: false,
              output: "",
              error: "Awaiting user approval",
            },
          };
          continue;
        }

        const result = await executeTool(name, args);
        yield { type: "tool_result", name, result };
        this.history.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }
    }

    yield { type: "text_delta", content: "\n\n(Reached maximum tool iterations.)" };
    yield { type: "done" };
  }

  async *approveTool(toolCallId: string): AsyncGenerator<AgentEvent> {
    const pending = this.pendingApprovals.get(toolCallId);
    if (!pending) {
      yield { type: "text_delta", content: "No pending action found." };
      yield { type: "done" };
      return;
    }

    this.pendingApprovals.delete(toolCallId);

    const result = await executeTool(pending.name, pending.args);
    yield { type: "tool_result", name: pending.name, result };

    // Update the awaiting tool message in history
    const toolIdx = this.history.findIndex(
      (m) => "tool_call_id" in m && m.tool_call_id === toolCallId
    );
    if (toolIdx >= 0) {
      this.history[toolIdx] = {
        role: "tool",
        tool_call_id: toolCallId,
        content: JSON.stringify(result),
      };
    }

    // Continue the agent loop
    let iterations = 0;
    while (iterations < config.maxToolIterations) {
      iterations++;
      const response = await this.client.chat.completions.create({
        model: config.model,
        messages: this.history,
        tools: toOpenAiTools(),
      });

      const message = response.choices[0]?.message;
      if (!message) {
        yield { type: "done" };
        return;
      }

      if (message.tool_calls?.length) {
        this.history.push(message);
        for (const tc of message.tool_calls) {
          const name = tc.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {
            args = {};
          }
          const dangerous = isDangerousTool(name);
          yield { type: "tool_call", name, args, dangerous };

          if (config.requireApproval && dangerous) {
            this.pendingApprovals.set(tc.id, { id: tc.id, name, args });
            yield {
              type: "tool_result",
              name,
              result: { success: false, output: "", error: "Awaiting user approval" },
            };
            this.history.push({
              role: "tool",
              tool_call_id: tc.id,
              content: JSON.stringify({ success: false, error: "Awaiting approval" }),
            });
            yield { type: "done" };
            return;
          }

          const result = await executeTool(name, args);
          yield { type: "tool_result", name, result };
          this.history.push({
            role: "tool",
            tool_call_id: tc.id,
            content: JSON.stringify(result),
          });
        }
        continue;
      }

      const content = message.content ?? "";
      this.history.push({ role: "assistant", content });
      yield { type: "text_delta", content };
      yield { type: "done" };
      return;
    }

    yield { type: "done" };
  }

  getPendingApprovals(): PendingApproval[] {
    return [...this.pendingApprovals.values()];
  }
}
