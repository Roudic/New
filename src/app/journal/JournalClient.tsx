"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpen,
  Check,
  CloudOff,
  Loader2,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useApp } from "@/context/AppContext";
import { useJournal, type SaveState } from "@/lib/useJournal";
import { NOTEBOOK_COLORS } from "@/lib/journal-types";
import type { JournalEntry } from "@/lib/journal-types";

const COLOR_DOT: Record<string, string> = {
  blue: "bg-brand-500",
  violet: "bg-violet-500",
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  cyan: "bg-cyan-500",
};

const MOOD_EMOJI: Record<string, string> = {
  great: "😄",
  good: "🙂",
  neutral: "😐",
  low: "😔",
  stressed: "😣",
  mixed: "🌗",
};

function SaveIndicator({
  saveState,
  lastSavedAt,
  isCloud,
}: {
  saveState: SaveState;
  lastSavedAt: Date | null;
  isCloud: boolean;
}) {
  if (saveState === "saving" || saveState === "dirty") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        Saving…
      </span>
    );
  }
  if (saveState === "error") {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-600">
        <CloudOff className="h-3.5 w-3.5" />
        Save failed — will retry
      </span>
    );
  }
  if (saveState === "saved" && lastSavedAt) {
    return (
      <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
        <Check className="h-3.5 w-3.5" />
        Saved{" "}
        {lastSavedAt.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        {!isCloud && " (this device)"}
      </span>
    );
  }
  return (
    <span className="text-xs font-semibold text-slate-400">
      {isCloud ? "Synced across devices" : "Stored on this device"}
    </span>
  );
}

function entryPreview(entry: JournalEntry): string {
  const text = entry.content.replace(/\s+/g, " ").trim();
  return text.length > 110 ? `${text.slice(0, 110)}…` : text || "No content yet";
}

function formatEntryDate(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) {
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function JournalClient() {
  const { isLoggedIn, hydrated } = useApp();
  const journal = useJournal();
  const {
    notebooks,
    entries,
    loading,
    isCloud,
    saveState,
    lastSavedAt,
    createNotebook,
    deleteNotebook,
    createEntry,
    updateEntry,
    deleteEntry,
  } = journal;

  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mobilePane, setMobilePane] = useState<"list" | "editor">("list");
  const [addingNotebook, setAddingNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState("");
  const contentRef = useRef<HTMLTextAreaElement | null>(null);

  const visibleEntries = useMemo(() => {
    const inNotebook = activeNotebookId
      ? entries.filter((e) => e.notebookId === activeNotebookId)
      : entries;
    const q = search.trim().toLowerCase();
    const filtered = q
      ? inNotebook.filter(
          (e) =>
            e.title.toLowerCase().includes(q) ||
            e.content.toLowerCase().includes(q) ||
            e.tags.some((t) => t.toLowerCase().includes(q))
        )
      : inNotebook;
    return [...filtered].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [entries, activeNotebookId, search]);

  const activeEntry = entries.find((e) => e.id === activeEntryId) ?? null;

  // Auto-grow the content textarea to fit its text.
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 260)}px`;
  }, [activeEntry?.id, activeEntry?.content]);

  if (!hydrated) return <AppShell>{null}</AppShell>;

  if (!isLoggedIn) {
    return (
      <AppShell>
        <div className="glass-panel mx-auto mt-16 max-w-md px-8 py-12 text-center">
          <NotebookPen className="mx-auto h-10 w-10 text-brand-600" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">Your Journal</h1>
          <p className="mt-2 text-sm text-slate-600">
            Sign in to write, autosave, and let AI organize your notes.
          </p>
          <Link href="/login" className="btn-primary mt-6">
            Sign in
          </Link>
        </div>
      </AppShell>
    );
  }

  const handleNewEntry = async () => {
    let notebookId = activeNotebookId ?? notebooks[0]?.id;
    if (!notebookId) {
      const nb = await createNotebook("My Journal", "blue");
      setActiveNotebookId(nb.id);
      notebookId = nb.id;
    }
    const entry = await createEntry(notebookId);
    setActiveEntryId(entry.id);
    setMobilePane("editor");
  };

  const handleAddNotebook = async () => {
    const name = newNotebookName.trim();
    if (!name) return;
    const color =
      NOTEBOOK_COLORS[notebooks.length % NOTEBOOK_COLORS.length];
    const nb = await createNotebook(name, color);
    setActiveNotebookId(nb.id);
    setNewNotebookName("");
    setAddingNotebook(false);
  };

  const handleDeleteEntry = async (entry: JournalEntry) => {
    if (!window.confirm("Delete this entry? This can't be undone.")) return;
    await deleteEntry(entry.id);
    if (activeEntryId === entry.id) {
      setActiveEntryId(null);
      setMobilePane("list");
    }
  };

  const notebookOf = (id: string) => notebooks.find((n) => n.id === id);

  const listPane = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Journal
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/journal/dashboard"
            className="btn-secondary px-3 py-2 text-xs"
          >
            <Sparkles className="h-4 w-4 text-brand-600" />
            AI Dashboard
          </Link>
          <button type="button" onClick={handleNewEntry} className="btn-primary px-3 py-2 text-xs">
            <Plus className="h-4 w-4" />
            New
          </button>
        </div>
      </div>

      <div className="mt-3">
        <SaveIndicator saveState={saveState} lastSavedAt={lastSavedAt} isCloud={isCloud} />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setActiveNotebookId(null)}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
            activeNotebookId === null
              ? "bg-brand-600 text-white shadow-sm"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          }`}
        >
          All notes
        </button>
        {notebooks.map((nb) => (
          <button
            key={nb.id}
            type="button"
            onClick={() => setActiveNotebookId(nb.id)}
            onDoubleClick={() => {
              if (
                window.confirm(`Delete notebook "${nb.name}" and all its entries?`)
              ) {
                deleteNotebook(nb.id).catch(console.error);
                if (activeNotebookId === nb.id) setActiveNotebookId(null);
              }
            }}
            title="Double-click to delete"
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
              activeNotebookId === nb.id
                ? "bg-slate-900 text-white shadow-sm"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${COLOR_DOT[nb.color] ?? "bg-brand-500"}`} />
            {nb.name}
          </button>
        ))}
        {addingNotebook ? (
          <span className="flex items-center gap-1">
            <input
              autoFocus
              value={newNotebookName}
              onChange={(e) => setNewNotebookName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleAddNotebook();
                if (e.key === "Escape") setAddingNotebook(false);
              }}
              onBlur={() => {
                if (newNotebookName.trim()) handleAddNotebook();
                else setAddingNotebook(false);
              }}
              placeholder="Notebook name"
              className="w-32 rounded-full border border-brand-300 bg-white px-3 py-1.5 text-xs font-semibold outline-none ring-2 ring-brand-100"
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => setAddingNotebook(true)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-semibold text-brand-600 ring-1 ring-dashed ring-brand-300 hover:bg-brand-50"
          >
            <Plus className="h-3.5 w-3.5" />
            Notebook
          </button>
        )}
      </div>

      <div className="relative mt-4">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search notes, tags…"
          className="field-input pl-9"
        />
      </div>

      <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pb-4 pr-1">
        {loading ? (
          <div className="glass-panel flex items-center justify-center px-6 py-12 text-sm text-slate-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading your journal…
          </div>
        ) : visibleEntries.length === 0 ? (
          <div className="glass-panel px-6 py-12 text-center">
            <BookOpen className="mx-auto h-9 w-9 text-slate-400" />
            <p className="mt-3 font-bold text-slate-900">
              {search ? "No matches" : "No entries yet"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {search
                ? "Try a different search."
                : "Start writing — everything autosaves as you type."}
            </p>
            {!search && (
              <button type="button" onClick={handleNewEntry} className="btn-primary mt-5">
                <Plus className="h-4 w-4" />
                Write your first entry
              </button>
            )}
          </div>
        ) : (
          visibleEntries.map((entry) => {
            const nb = notebookOf(entry.notebookId);
            const active = entry.id === activeEntryId;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  setActiveEntryId(entry.id);
                  setMobilePane("editor");
                }}
                className={`block w-full rounded-2xl border p-4 text-left transition ${
                  active
                    ? "border-brand-300 bg-brand-50/70 shadow-glow"
                    : "border-slate-200/80 bg-white shadow-card hover:-translate-y-0.5 hover:shadow-card-hover"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-bold text-slate-900">
                    {entry.pinned && (
                      <Pin className="mr-1 inline h-3.5 w-3.5 text-amber-500" />
                    )}
                    {entry.title || "Untitled"}
                    {entry.mood && MOOD_EMOJI[entry.mood] && (
                      <span className="ml-1.5">{MOOD_EMOJI[entry.mood]}</span>
                    )}
                  </p>
                  <span className="shrink-0 text-xs font-semibold text-slate-400">
                    {formatEntryDate(entry.updatedAt)}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                  {entryPreview(entry)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {nb && (
                    <span className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      <span className={`h-1.5 w-1.5 rounded-full ${COLOR_DOT[nb.color] ?? "bg-brand-500"}`} />
                      {nb.name}
                    </span>
                  )}
                  {entry.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-brand-700"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const editorPane = activeEntry ? (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center justify-between gap-2 pb-3">
        <button
          type="button"
          onClick={() => setMobilePane("list")}
          className="btn-secondary px-3 py-2 text-xs md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          Notes
        </button>
        <span className="hidden text-xs font-semibold text-slate-400 md:block">
          {new Date(activeEntry.entryDate).toLocaleDateString([], {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <div className="flex items-center gap-2">
          <SaveIndicator saveState={saveState} lastSavedAt={lastSavedAt} isCloud={isCloud} />
          <button
            type="button"
            onClick={() =>
              updateEntry(activeEntry.id, { pinned: !activeEntry.pinned })
            }
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-amber-300 hover:text-amber-500"
            title={activeEntry.pinned ? "Unpin" : "Pin to top"}
          >
            {activeEntry.pinned ? (
              <PinOff className="h-4 w-4" />
            ) : (
              <Pin className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => handleDeleteEntry(activeEntry)}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 transition hover:border-rose-300 hover:text-rose-600"
            title="Delete entry"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="glass-panel flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5 md:px-8 md:py-7">
        <input
          value={activeEntry.title}
          onChange={(e) => updateEntry(activeEntry.id, { title: e.target.value })}
          placeholder="Title"
          className="w-full bg-transparent text-2xl font-bold tracking-tight text-slate-900 outline-none placeholder:text-slate-300 md:text-3xl"
        />
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {activeEntry.mood && MOOD_EMOJI[activeEntry.mood] && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
              {MOOD_EMOJI[activeEntry.mood]} {activeEntry.mood}
            </span>
          )}
          {activeEntry.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700"
            >
              #{tag}
            </span>
          ))}
          {(activeEntry.tags.length > 0 || activeEntry.mood) && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              tagged by AI
            </span>
          )}
        </div>
        {activeEntry.aiSummary && (
          <p className="mt-3 rounded-xl border border-brand-100 bg-brand-50/60 px-3.5 py-2.5 text-sm text-brand-900">
            <Sparkles className="mr-1.5 inline h-3.5 w-3.5" />
            {activeEntry.aiSummary}
          </p>
        )}
        <textarea
          ref={contentRef}
          value={activeEntry.content}
          onChange={(e) => updateEntry(activeEntry.id, { content: e.target.value })}
          placeholder="Write freely — your words are saved as you type…"
          className="mt-4 w-full flex-1 resize-none bg-transparent text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-300"
        />
        <p className="mt-4 shrink-0 text-right text-[11px] font-semibold text-slate-400">
          {activeEntry.content.trim() ? activeEntry.content.trim().split(/\s+/).length : 0}{" "}
          words
        </p>
      </div>
    </div>
  ) : (
    <div className="hidden h-full items-center justify-center md:flex">
      <div className="text-center">
        <NotebookPen className="mx-auto h-10 w-10 text-slate-300" />
        <p className="mt-3 font-semibold text-slate-500">
          Select a note or start a new one
        </p>
        <button type="button" onClick={handleNewEntry} className="btn-primary mt-4">
          <Plus className="h-4 w-4" />
          New entry
        </button>
      </div>
    </div>
  );

  return (
    <AppShell>
      <div className="md:grid md:h-[calc(100dvh-11rem)] md:grid-cols-[minmax(300px,380px)_1fr] md:gap-6">
        <div className={`${mobilePane === "editor" ? "hidden md:flex" : "flex"} h-full min-h-0 flex-col`}>
          {listPane}
        </div>
        <div
          className={`${
            mobilePane === "list" ? "hidden md:block" : "block"
          } mt-4 h-full min-h-0 md:mt-0`}
        >
          {editorPane}
        </div>
      </div>
    </AppShell>
  );
}
