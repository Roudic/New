import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { ensureJournalTables } from "@/lib/journal-db";
import { serializeEntry } from "@/lib/journal-serializers";
import type { AiAction } from "@/lib/journal-types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-4-8";
const MAX_ENTRIES = 60;
const MAX_CHARS_PER_ENTRY = 2000;

interface AiRequestBody {
  action: AiAction;
  notebookId?: string;
  days?: number;
  question?: string;
}

function formatEntries(
  entries: Array<{
    id: string;
    title: string;
    content: string;
    tags: string;
    mood: string | null;
    entryDate: Date;
    notebook?: { name: string };
  }>
): string {
  return entries
    .map((e) => {
      const body =
        e.content.length > MAX_CHARS_PER_ENTRY
          ? `${e.content.slice(0, MAX_CHARS_PER_ENTRY)}…`
          : e.content;
      return [
        `<entry id="${e.id}" date="${e.entryDate.toISOString().slice(0, 10)}"${
          e.notebook ? ` notebook="${e.notebook.name}"` : ""
        }>`,
        `Title: ${e.title || "(untitled)"}`,
        e.mood ? `Mood: ${e.mood}` : null,
        `Tags: ${e.tags}`,
        body,
        `</entry>`,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");
}

export async function POST(request: Request) {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;
  await ensureJournalTables();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error:
          "AI is not configured. Add ANTHROPIC_API_KEY to your environment variables.",
      },
      { status: 503 }
    );
  }

  const body = (await request.json()) as AiRequestBody;
  const days = Math.min(Math.max(body.days ?? 30, 1), 365);
  const since = new Date();
  since.setDate(since.getDate() - days);

  const entries = await prisma.journalEntry.findMany({
    where: {
      userId: auth.user.id,
      ...(body.notebookId ? { notebookId: body.notebookId } : {}),
      ...(body.action === "summarize" || body.action === "reflect"
        ? { entryDate: { gte: since } }
        : {}),
    },
    include: { notebook: { select: { name: true } } },
    orderBy: { entryDate: "desc" },
    take: MAX_ENTRIES,
  });

  if (entries.length === 0) {
    return NextResponse.json(
      { error: "No journal entries found for that range yet. Write something first!" },
      { status: 404 }
    );
  }

  const client = new Anthropic();
  const corpus = formatEntries(entries);

  try {
    if (body.action === "organize") {
      const schema = {
        type: "object" as const,
        properties: {
          results: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                entryId: { type: "string" as const },
                tags: {
                  type: "array" as const,
                  items: { type: "string" as const },
                },
                mood: {
                  type: "string" as const,
                  enum: [
                    "great",
                    "good",
                    "neutral",
                    "low",
                    "stressed",
                    "mixed",
                  ],
                },
                summary: { type: "string" as const },
              },
              required: ["entryId", "tags", "mood", "summary"],
              additionalProperties: false,
            },
          },
        },
        required: ["results"],
        additionalProperties: false,
      };

      const response = await client.messages.create({
        model: MODEL,
        max_tokens: 16000,
        thinking: { type: "adaptive" },
        output_config: { format: { type: "json_schema", schema } },
        system:
          "You organize a personal journal. For each entry, assign 1-4 short lowercase topic tags (reuse tags across entries when topics repeat so the journal stays tidy), a mood, and a one-sentence summary. Base everything strictly on the entry text.",
        messages: [
          {
            role: "user",
            content: `Organize these journal entries. Return one result per entry, keyed by its id.\n\n${corpus}`,
          },
        ],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      const parsed = JSON.parse(textBlock && "text" in textBlock ? textBlock.text : "{}") as {
        results?: Array<{ entryId: string; tags: string[]; mood: string; summary: string }>;
      };
      const results = parsed.results ?? [];
      const validIds = new Set(entries.map((e) => e.id));

      const updated = await Promise.all(
        results
          .filter((r) => validIds.has(r.entryId))
          .map((r) =>
            prisma.journalEntry.update({
              where: { id: r.entryId },
              data: {
                tags: JSON.stringify(r.tags.slice(0, 4)),
                mood: r.mood,
                aiSummary: r.summary,
              },
            })
          )
      );

      return NextResponse.json({
        organized: updated.length,
        entries: updated.map(serializeEntry),
      });
    }

    const prompts: Record<Exclude<AiAction, "organize">, { system: string; user: string }> = {
      summarize: {
        system:
          "You are a thoughtful journaling assistant. Summarize the user's journal entries into a clear digest: what happened, recurring themes, notable moments, and anything left open. Write in second person ('you'). Use short markdown sections with headers. Be warm but concrete — cite specific days when useful.",
        user: `Summarize my journal from the last ${days} days.\n\n${corpus}`,
      },
      ask: {
        system:
          "You are a journaling assistant that answers questions using ONLY the user's journal entries below. Quote or reference specific entries and dates as evidence. If the journal doesn't contain the answer, say so plainly. Answer in second person, in concise markdown.",
        user: `${body.question?.trim() || "What themes stand out in my journal?"}\n\nMy journal entries:\n\n${corpus}`,
      },
      reflect: {
        system:
          "You are a reflective journaling coach. From the user's recent entries, surface: 1) patterns in mood and energy, 2) what seems to be going well, 3) friction points or worries that keep recurring, and 4) two or three gentle, specific suggestions or reflection questions for the week ahead. Use short markdown sections. Ground every observation in the entries — no generic advice.",
        user: `Reflect on my journal from the last ${days} days.\n\n${corpus}`,
      },
    };

    const prompt = prompts[body.action];
    if (!prompt) {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      system: prompt.system,
      messages: [{ role: "user", content: prompt.user }],
    });
    const message = await stream.finalMessage();

    const text = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");

    return NextResponse.json({ text, entryCount: entries.length });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json(
        { error: "AI key is invalid. Check ANTHROPIC_API_KEY." },
        { status: 503 }
      );
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "AI is rate limited right now — try again in a minute." },
        { status: 429 }
      );
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: `AI request failed (${error.status}). Try again.` },
        { status: 502 }
      );
    }
    throw error;
  }
}
