"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarClock,
  CheckCircle2,
  ListChecks,
  Plus,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { PageHeader } from "@/components/PageHeader";
import { ScorecardStrip } from "@/components/l10/ScorecardStrip";
import { StatusBadge } from "@/components/l10/StatusBadge";
import { useApp } from "@/context/AppContext";
import { L10_TOTAL_MINUTES } from "@/lib/l10/defaults";
import {
  meetingProgress,
  nextSession,
  openIssueCount,
  openTodoCount,
  prepProgress,
} from "@/lib/l10/session";
import type { L10Session } from "@/lib/l10/types";
import { formatDateTime } from "@/lib/utils";
import { useL10 } from "@/lib/useL10";

function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-cfa transition-all"
        style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
      />
    </div>
  );
}

export function HubClient() {
  const router = useRouter();
  const { hydrated, isLoggedIn } = useApp();
  const { sessions, loading, createSession, error } = useL10();
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (!isLoggedIn) router.replace("/login");
  }, [hydrated, isLoggedIn, router]);

  const featured = useMemo(() => nextSession(sessions), [sessions]);
  const past = useMemo(
    () =>
      sessions
        .filter((session) => session.id !== featured?.id)
        .sort(
          (a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime()
        ),
    [featured, sessions]
  );

  const startThisWeek = async () => {
    setCreating(true);
    setCreateError(null);
    try {
      const session = await createSession({ copyFromPrevious: true });
      router.push(`/l10/${session.id}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Could not create an L10 session.");
    } finally {
      setCreating(false);
    }
  };

  if (!hydrated || !isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-slate-500">
        Loading L10…
      </div>
    );
  }

  return (
    <AppShell wide>
      <PageHeader
        eyebrow="EOS · Weekly leadership"
        title="Level 10 Meetings"
        description="Prep what to bring, run the 90-minute L10, and keep rocks, to-dos, and IDS issues in one place for every session."
        action={
          <button
            type="button"
            onClick={() => void startThisWeek()}
            disabled={creating}
            className="btn-primary bg-cfa hover:bg-cfa-dark"
          >
            <Plus className="h-4 w-4" />
            {creating ? "Creating…" : "New L10 session"}
          </button>
        }
      />

      {(error || createError) && (
        <p className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {createError ?? error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading sessions…</p>
      ) : (
        <>
          {featured ? (
            <FeaturedCard session={featured} />
          ) : (
            <section className="glass-panel mb-8 p-8 text-center">
              <CalendarClock className="mx-auto h-10 w-10 text-cfa" />
              <p className="mt-3 text-lg font-bold text-slate-900">No L10 on the books yet</p>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
                Start a session for this week. Open to-dos, rocks, and unsolved issues will
                carry forward automatically after your first meeting.
              </p>
              <button
                type="button"
                onClick={() => void startThisWeek()}
                disabled={creating}
                className="btn-primary mx-auto mt-5 bg-cfa hover:bg-cfa-dark"
              >
                <Sparkles className="h-4 w-4" />
                {creating ? "Creating…" : "Start this week's L10"}
              </button>
            </section>
          )}

          <div className="mb-8 grid gap-4 sm:grid-cols-3">
            <article className="glass-panel p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Agenda
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">{L10_TOTAL_MINUTES} min</p>
              <p className="mt-1 text-xs text-slate-500">
                Segue → Scorecard → Rocks → Headlines → To-dos → IDS → Conclude
              </p>
            </article>
            <article className="glass-panel p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                Open to-dos
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {featured ? openTodoCount(featured) : 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Carried into the next session until done</p>
            </article>
            <article className="glass-panel p-5">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                IDS parking lot
              </p>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {featured ? openIssueCount(featured) : 0}
              </p>
              <p className="mt-1 text-xs text-slate-500">Unsolved issues waiting for Identify, Discuss, Solve</p>
            </article>
          </div>

          <div className="mb-10">
            <ScorecardStrip />
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="section-title">Session history</h2>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {past.length} past
              </p>
            </div>
            {past.length === 0 ? (
              <p className="text-sm text-slate-500">
                Wrapped meetings will land here so you can reopen notes, ratings, and to-dos.
              </p>
            ) : (
              <ul className="space-y-3">
                {past.map((session) => (
                  <li key={session.id}>
                    <SessionRow session={session} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </AppShell>
  );
}

function FeaturedCard({ session }: { session: L10Session }) {
  const prep = prepProgress(session);
  const meeting = meetingProgress(session);

  return (
    <Link
      href={`/l10/${session.id}`}
      className="mb-8 block overflow-hidden rounded-2xl bg-cfa p-6 text-white shadow-card transition hover:bg-cfa-dark"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-white/70">
            This week&apos;s L10
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{session.title}</h2>
          <p className="mt-2 text-sm text-white/80">
            {formatDateTime(session.scheduledAt)}
            {session.location ? ` · ${session.location}` : ""}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
          Open session <ArrowRight className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <ListChecks className="h-3.5 w-3.5" /> Prep packed
            </span>
            <span>
              {prep.packed}/{prep.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${prep.percent}%` }} />
          </div>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs font-semibold text-white/80">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5" /> Agenda
            </span>
            <span>
              {meeting.done}/{meeting.total}
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${meeting.percent}%` }} />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SessionRow({ session }: { session: L10Session }) {
  const prep = prepProgress(session);
  return (
    <Link
      href={`/l10/${session.id}`}
      className="glass-panel flex items-center justify-between gap-4 px-5 py-4 hover:bg-white"
    >
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-900">{session.title}</p>
          <StatusBadge status={session.status} />
        </div>
        <p className="mt-1 text-sm text-slate-500">
          {formatDateTime(session.scheduledAt)}
          {session.location ? ` · ${session.location}` : ""}
          {session.rating != null ? ` · rated ${session.rating}/10` : ""}
        </p>
      </div>
      <div className="hidden w-32 shrink-0 sm:block">
        <ProgressBar percent={prep.percent} />
        <p className="mt-1 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">
          {prep.packed} packed
        </p>
      </div>
    </Link>
  );
}
