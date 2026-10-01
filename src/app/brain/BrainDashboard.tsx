"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Brain, Inbox, Network, ShieldAlert, Sparkles } from "lucide-react";
import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";
import { MAP_CATEGORY_COLORS } from "@/lib/second-brain/design-tokens";
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
  const chip = note.category ? MAP_CATEGORY_COLORS[note.category] : undefined;
  return (
    <article data-note-id={note.id} className="brain-note">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-extrabold tracking-tight text-[var(--brain-ink)]">
          {note.title}
        </h3>
        {note.category && (
          <span className="brain-chip" style={{ "--brain-chip": chip } as React.CSSProperties}>
            {note.category}
          </span>
        )}
      </div>
      <p className="mt-1 line-clamp-4 text-sm leading-relaxed text-[var(--brain-muted)]">
        {note.body}
      </p>
      <p className="mt-2 text-[11px] text-[var(--brain-taupe)]">{note.actorEmail}</p>
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
    <section id={id} className="brain-card flex min-h-[16rem] flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="brain-card-title">{title}</h2>
        <span className="brain-count">{count}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2">
        {notes.length === 0 ? (
          <p className="text-sm text-[var(--brain-muted)]">{empty}</p>
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
      <div className="brain-shell flex min-h-screen items-center justify-center">
        <p className="text-sm font-semibold text-[var(--brain-muted)]">Loading Second Brain…</p>
      </div>
    );
  }

  return (
    <div className="brain-shell">
      <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-[calc(1rem+env(safe-area-inset-top))] md:pb-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="brain-mark" aria-hidden="true">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <p className="brain-kicker">Manager-only · 4 seats</p>
              <h1 className="brain-display text-2xl text-[var(--brain-ink)]">Second Brain OPs</h1>
              <p className="text-sm text-[var(--brain-muted)]">{state.actor}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href="/brain/map" id="brain-open-map" className="brain-btn brain-btn--primary py-2">
              <Network className="h-4 w-4" />
              Brain map
            </Link>
            {BRAIN_LOGIN_ENABLED && (
              <button type="button" onClick={() => void logout()} className="brain-btn brain-btn--ghost py-2">
                Sign out
              </button>
            )}
          </div>
        </header>

        <BrainOpenBanner />

        <div id="drive-status" className="brain-banner brain-banner--warn">
          <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[var(--brain-coral)]" />
          <div>
            <p className="text-sm font-extrabold">
              Drive is not wired{state.drive.folderId ? "" : " (folder id is null)"}
            </p>
            <p className="mt-1 text-sm font-medium opacity-90">{state.drive.message}</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 md:grid-cols-4">
          {state.seats.map((seat) => (
            <div key={seat.seat} className="brain-card brain-seat">
              <p className="brain-kicker">Seat {seat.seat}</p>
              <p className="mt-1 text-sm font-extrabold text-[var(--brain-ink)]">
                {seat.name ?? "Open"}
              </p>
              <p className="truncate text-xs text-[var(--brain-muted)]">
                {seat.email ?? "pending invite"}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-[var(--brain-muted)]">
                <span
                  className={
                    seat.status === "active" ? "brain-seat-pip brain-seat-pip--active" : "brain-seat-pip"
                  }
                />
                {seat.status}
              </p>
            </div>
          ))}
        </div>

        <form onSubmit={(e) => void capture(e)} className="brain-card brain-card--capture mb-6">
          <div className="mb-3 flex items-center gap-2">
            <Inbox className="h-4 w-4 text-[var(--brain-coral)]" />
            <h2 className="brain-card-title">Quick capture</h2>
          </div>
          <p className="mb-3 text-sm text-[var(--brain-muted)]">
            Drop a messy note. No folder picking. It lands in the shared inbox, then Sort files it.
          </p>
          <label className="brain-field" htmlFor="brain-title">
            Title
          </label>
          <input
            id="brain-title"
            className="brain-input mb-3"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Optional"
          />
          <label className="brain-field" htmlFor="brain-body">
            Note
          </label>
          <textarea
            id="brain-body"
            className="brain-input mb-3 min-h-[7rem]"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Shift, vendor, training, incident…"
            required
          />
          {error && <p className="mb-3 text-sm font-semibold text-[var(--brain-coral)]">{error}</p>}
          <div className="flex flex-col gap-2 sm:flex-row">
            <button id="brain-capture" type="submit" className="brain-btn brain-btn--primary" disabled={busy}>
              Capture to inbox
            </button>
            <button
              id="brain-process"
              type="button"
              className="brain-btn brain-btn--ghost"
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
