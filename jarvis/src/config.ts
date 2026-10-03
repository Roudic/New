import { homedir } from "node:os";
import { resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT ?? "3001", 10),
  openaiApiKey: process.env.OPENAI_API_KEY ?? "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL,
  model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
  workspace: resolve(process.env.JARVIS_WORKSPACE ?? homedir()),
  requireApproval: process.env.JARVIS_REQUIRE_APPROVAL !== "false",
  maxToolIterations: 10,
  shellTimeoutMs: 30_000,
};

export function assertConfig(): void {
  if (!config.openaiApiKey) {
    throw new Error(
      "OPENAI_API_KEY is required. Copy jarvis/.env.example to jarvis/.env and add your key."
    );
  }
}
