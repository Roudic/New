"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  Flame,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
  Tags,
  Wand2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { useJournal } from "@/lib/useJournal";
import type { JournalEntry } from "@/lib/journal-types";

const MOOD_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  neutral: "😐",
  low: "😔",
  stressed: "😣",
  mixed: "🌗",
};

/** Minimal markdown rendering for AI responses (headers, bold, bullets). */
function renderMarkdownLite(text: string): ReactNode {
  const lines = text.split("\n");
  const out: ReactNode[] = [];
  let list: string[] = [];

  const renderInline = (s: string, key: number) => {
    const parts = s.split(/(\*\*[^*]+\*\*)/g);
    return (
      <span key={key}>
        {parts.map((p, i) =>
          p.startsWith("**") && p.endsWith("**") ? (
            <strong key={i} className="font-semibold text-slate-900">
              {p.slice(2, -2)}
            </strong>
          ) : (
            p
          )
        )}
      </span>
    );
  };

  const flushList = (key: string) => {
    if (list.length === 0) return;
    out.push(
      <ul key={key} className="my-2 list-disc space-y-1 pl-5">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, i)}</li>
        ))}
      </ul>
    );
    list = [];
  };

  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)/);
    if (bullet) {
      list.push(bullet[1]);
      return;
    }
    flushList(`list-${i}`);
    const header = line.match(/^(#{1,4})\s+(.*)/);
    if (header) {
      out.push(
        <p key={i} className="mt-4 text-sm font-bold uppercase tracking-wide text-slate-900 first:mt-0">
          {header[2]}
        </p>
      );
    } else if (line.trim()) {
      out.push(
        <p key={i} className="my-1.5">
          {renderInline(line, i)}
        </p>
      );
    }
  });
  flushList("list-end");
  return <div className="text-sm leading-6 text-slate-700">{out}</div>;
}

function computeStreak(entries: JournalEntry[]): number {
  const days = new Set(
    entries.map((e) => new Date(e.entryDate).toDateString())
  );
  let streak = 0;
  const cursor = new Date();
  // A streak counts from today, or from yesterday if today hasn't been written yet.
  if (!days.has(cursor.toDateString())) cursor.setDate(cursor.getDate() - 1);
  while (days.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function StatCard({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="glass-panel flex items-center gap-3 px-4 py-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold leading-tight text-slate-900">{value}</p>
        <p className="truncate text-xs font-semibold text-slate-500">
          {label}
          {hint ? ` · ${hint}` : ""}
        </p>
      </div>
    </div>
  );
}

type AiPanel = "summarize" | "reflect" | "ask";

export function DashboardClient() {
  const { isLoggedIn, hydrated } = useApp();
  const journal = useJournal();
  const { entries, isCloud, applyServerEntries, loading } = journal;

  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState<AiPanel | "organize" | null>(null);
  const [aiText, setAiText] = useState<{ panel: AiPanel; text: string } | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [question, setQuestion] = useState("");
  const [organizeNote, setOrganizeNote] = useState<string | null>(null);

  const stats = useMemo(() => {
    const now = Date.now();
    const weekAgo = now - 7 * 86400000;
    const thisWeek = entries.filter(
      (e) => new Date(e.entryDate).getTime() >= weekAgo
    ).length;
    const words = entries.reduce(
      (sum, e) => sum + (e.content.trim() ? e.content.trim().split(/\s+/).length : 0),
      0
    );
    const tagCounts = new Map<string, number>();
    const moodCounts = new Map<string, number>();
    entries.forEach((e) => {
      e.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1));
      if (e.mood) moodCounts.set(e.mood, (moodCounts.get(e.mood) ?? 0) + 1);
    });
    return {
      total: entries.length,
      thisWeek,
      words,
      streak: computeStreak(entries),
      topTags: Array.from(tagCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      moods: Array.from(moodCounts.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [entries]);

  const callAi = async (
    action: AiPanel | "organize",
    extra?: Record<string, unknown>
  ) => {
    setBusy(action);
    setAiError(null);
    setOrganizeNote(null);
    try {
      const res = await fetch("/api/journal/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, days, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "AI request failed");
      if (action === "organize") {
        applyServerEntries(data.entries ?? []);
        setOrganizeNote(
          `Organized ${data.organized} ${data.organized === 1 ? "entry" : "entries"} — tags, moods, and summaries applied.`
        );
      } else {
        setAiText({ panel: action, text: data.text });
      }
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI request failed");
    } finally {
      setBusy(null);
    }
  };

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!isLoggedIn) {
    return (
      <AppShell>
        <div className="glass-panel mx-auto mt-16 max-w-md px-8 py-12 text-center">
          <Sparkles className="mx-auto h-10 w-10 text-brand-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">AI Dashboard</h1>
          <p className="mt-2 text-sm text-slate-600">Sign in to see your journal insights.</p>
          <Link href="/login" className="btn-primary mt-6">
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const aiAvailable = isCloud;

  return (
    <AppShell>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-brand-600">
            Journal Insights
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            AI Dashboard
          </h1>
        </div>
        <Link href="/journal" className="btn-secondary px-3 py-2 text-xs">
          <ArrowLeft className="h-4 w-4" />
          Back to Journal
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={<BookOpen className="h-5 w-5" />} label="Total entries" value={String(stats.total)} />
        <StatCard icon={<CalendarDays className="h-5 w-5" />} label="This week" value={String(stats.thisWeek)} />
        <StatCard
          icon={<Flame className="h-5 w-5" />}
          label="Day streak"
          value={String(stats.streak)}
          hint={stats.streak > 0 ? "keep it going" : "write today"}
        />
        <StatCard
          icon={<Tags className="h-5 w-5" />}
          label="Words written"
          value={stats.words.toLocaleString()}
        />
      </div>

      {!aiAvailable && (
        <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>Offline demo mode:</strong> AI features need the cloud database and an
          Anthropic API key. Your stats above still work — deploy with{" "}
          <code className="rounded bg-amber-100 px-1">DATABASE_URL</code> and{" "}
          <code className="rounded bg-amber-100 px-1">ANTHROPIC_API_KEY</code> to unlock
          summaries, auto-organize, and Q&amp;A.
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        {/* Summarize / Reflect */}
        <div className="glass-panel px-5 py-5 md:px-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="section-title flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-brand-600" />
              Summaries &amp; Reflection
            </h2>
            <div className="flex items-center gap-1 rounded-full bg-slate-100 p-1">
              {[7, 30, 90].map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDays(d)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                    days === d ? "bg-white text-brand-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Let Claude digest your last {days} days of writing.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!aiAvailable || busy !== null}
              onClick={() => callAi("summarize")}
              className="btn-primary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "summarize" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BookOpen className="h-4 w-4" />
              )}
              Summarize
            </button>
            <button
              type="button"
              disabled={!aiAvailable || busy !== null}
              onClick={() => callAi("reflect")}
              className="btn-secondary px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "reflect" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Reflect on patterns
            </button>
          </div>
          {aiText && (aiText.panel === "summarize" || aiText.panel === "reflect") && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-4">
              {renderMarkdownLite(aiText.text)}
            </div>
          )}
        </div>

        {/* Ask anything */}
        <div className="glass-panel px-5 py-5 md:px-6">
          <h2 className="section-title flex items-center gap-2">
            <MessageCircleQuestion className="h-5 w-5 text-brand-600" />
            Ask your journal anything
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            &ldquo;When did I last mention the gym?&rdquo; &middot; &ldquo;What have I been worried
            about?&rdquo;
          </p>
          <form
            className="mt-4 flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (question.trim()) callAi("ask", { question });
            }}
          >
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask a question…"
              className="field-input"
              disabled={!aiAvailable}
            />
            <button
              type="submit"
              disabled={!aiAvailable || busy !== null || !question.trim()}
              className="btn-primary shrink-0 px-4 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "ask" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}
            </button>
          </form>
          {aiText && aiText.panel === "ask" && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-white/70 px-4 py-4">
              {renderMarkdownLite(aiText.text)}
            </div>
          )}
        </div>

        {/* Auto-organize */}
        <div className="glass-panel px-5 py-5 md:px-6">
          <h2 className="section-title flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-brand-600" />
            Auto-organize
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Claude tags every entry by topic, detects the mood, and writes a one-line
            summary — so your journal sorts itself.
          </p>
          <button
            type="button"
            disabled={!aiAvailable || busy !== null}
            onClick={() => callAi("organize")}
            className="btn-primary mt-4 px-3.5 py-2 text-xs disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy === "organize" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Wand2 className="h-4 w-4" />
            )}
            Organize my journal
          </button>
          {organizeNote && (
            <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm text-emerald-800">
              {organizeNote}
            </p>
          )}
          {stats.moods.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Mood mix
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {stats.moods.map(([mood, count]) => (
                  <span
                    key={mood}
                    className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600"
                  >
                    {MOOD_EMOJI[mood] ?? "•"} {mood} × {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Topics */}
        <div className="glass-panel px-5 py-5 md:px-6">
          <h2 className="section-title flex items-center gap-2">
            <Tags className="h-5 w-5 text-brand-600" />
            Topics
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            What you&apos;ve been writing about most.
          </p>
          {stats.topTags.length === 0 ? (
            <p className="mt-4 text-sm text-slate-400">
              {loading
                ? "Loading…"
                : "No tags yet — run Auto-organize to build your topic map."}
            </p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {stats.topTags.map(([tag, count]) => (
                <span
                  key={tag}
                  className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700"
                  style={{ fontSize: `${Math.min(0.8 + count * 0.08, 1.15)}rem` }}
                >
                  #{tag}
                  <span className="ml-1 text-xs text-brand-400">{count}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {aiError && (
        <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
          {aiError}
        </div>
      )}
    </AppShell>
  );
}
