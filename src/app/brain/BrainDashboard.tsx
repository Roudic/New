"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Inbox, Network, ShieldAlert, Sparkles } from "lucide-react";
import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";
import BrainOpenBanner from "./BrainOpenBanner";

interface Seat {
  seat: number;
  name: string | null;
  email: string | null;
  status: string;
  driveShareConfirmed: boolean;
}

interface Note {
  id: string;
  title: string;
  body: string;
  actorEmail: string;
  status: string;
  category?: string;
  capturedAt: string;
}

interface BrainState {
  actor: string;
  drive: {
    live: boolean;
    folderId: string | null;
    folderName: string;
    message: string;
  };
  seats: Seat[];
  inbox: Note[];
  needsReview: Note[];
  filed: Note[];
}

function NoteCard({ note }: { note: Note }) {
  return (
    <article
      data-note-id={note.id}
      className="rounded-xl border border-slate-200 bg-white p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-slate-900">{note.title}</h3>
        {note.category && (
          <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
            {note.category}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-4 text-sm text-slate-600">{note.body}</p>
      <p className="mt-2 text-[11px] text-slate-400">{note.actorEmail}</p>
    </article>
  );
}

function Column({
  id,
  title,
  count,
  notes,
  empty,
}: {
  id: string;
  title: string;
  count: number;
  notes: Note[];
  empty: string;
}) {
  return (
    <section id={id} className="glass-panel flex min-h-[16rem] flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title text-base">{title}</h2>
        <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-bold text-brand-700">
          {count}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {notes.length === 0 ? (
          <p className="text-sm text-slate-500">{empty}</p>
        ) : (
          notes.map((note) => <NoteCard key={note.id} note={note} />)
        )}
      </div>
    </section>
  );
}

export default function BrainDashboard() {
  const router = useRouter();
  const [state, setState] = useState<BrainState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/brain/api/state");
    if (BRAIN_LOGIN_ENABLED && (res.status === 401 || res.status === 403)) {
      router.replace("/brain/login");
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Could not load Second Brain.");
      return;
    }
    setState(data);
    setError(null);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const capture = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/brain/api/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Capture failed.");
        return;
      }
      setTitle("");
      setBody("");
      await load();
    } finally {
      setBusy(false);
    }
  };

  const processInbox = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/brain/api/process", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Process failed.");
        return;
      }
      await load();
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    if (!BRAIN_LOGIN_ENABLED) return;
    await fetch("/brain/api/logout", { method: "POST" });
    router.replace("/brain/login");
  };

  if (!state) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm font-medium text-slate-600">Loading Second Brain…</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-hero-gradient">
      <div className="pointer-events-none fixed inset-0 bg-grid-pattern bg-grid opacity-40" />
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-[calc(1rem+env(safe-area-inset-top))] md:pb-10">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Manager-only · 4 seats
            </p>
            <h1 className="text-xl font-bold text-slate-900">Second Brain OPs</h1>
            <p className="text-sm text-slate-600">{state.actor}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/brain/map" id="brain-open-map" className="btn-primary py-2">
            <Network className="h-4 w-4" />
            3D brain map
          </Link>
          {BRAIN_LOGIN_ENABLED && (
            <button type="button" onClick={() => void logout()} className="btn-secondary py-2">
              Sign out
            </button>
          )}
        </div>
      </header>

      <BrainOpenBanner />

      <div
        id="drive-status"
        className="mb-4 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div>
          <p className="text-sm font-semibold text-amber-950">
            Drive is not wired{state.drive.folderId ? "" : " (folder id is null)"}
          </p>
          <p className="mt-1 text-sm text-amber-900">{state.drive.message}</p>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
        {state.seats.map((seat) => (
          <div key={seat.seat} className="glass-panel p-3">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Seat {seat.seat}
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {seat.name ?? "Open"}
            </p>
            <p className="truncate text-xs text-slate-500">{seat.email ?? "pending invite"}</p>
            <p className="mt-1 text-[11px] font-medium text-slate-600">{seat.status}</p>
          </div>
        ))}
      </div>

      <form onSubmit={(e) => void capture(e)} className="glass-panel mb-6 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Inbox className="h-4 w-4 text-brand-700" />
          <h2 className="section-title text-base">Quick capture</h2>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          Drop a messy note. No folder picking. It lands in the shared inbox, then Sort files it.
        </p>
        <label className="field-label" htmlFor="brain-title">
          Title
        </label>
        <input
          id="brain-title"
          className="field-input mb-3"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Optional"
        />
        <label className="field-label" htmlFor="brain-body">
          Note
        </label>
        <textarea
          id="brain-body"
          className="field-input mb-3 min-h-[7rem]"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Shift, vendor, training, incident…"
          required
        />
        {error && (
          <p className="mb-3 text-sm font-medium text-rose-700">{error}</p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row">
          <button id="brain-capture" type="submit" className="btn-primary" disabled={busy}>
            Capture to inbox
          </button>
          <button
            id="brain-process"
            type="button"
            className="btn-secondary"
            disabled={busy}
            onClick={() => void processInbox()}
          >
            <Sparkles className="h-4 w-4" />
            Sort inbox
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-3">
        <Column
          id="inbox-list"
          title="Unorganized inbox"
          count={state.inbox.length}
          notes={state.inbox}
          empty="Inbox is empty."
        />
        <Column
          id="review-list"
          title="Needs review"
          count={state.needsReview.length}
          notes={state.needsReview}
          empty="Nothing waiting on a manager glance."
        />
        <Column
          id="filed-list"
          title="Filed"
          count={state.filed.length}
          notes={state.filed}
          empty="Nothing filed yet."
        />
      </div>
      </div>
    </div>
  );
}
