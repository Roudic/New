"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, LogOut, ShieldAlert } from "lucide-react";
import type { BrainGraphLink, BrainGraphNode } from "@/lib/second-brain/graph";
import { MAP_CATEGORY_COLORS } from "@/lib/second-brain/graph";

const BrainForceGraph = dynamic(() => import("./BrainForceGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-slate-400">
      Loading 3D map…
    </div>
  ),
});

const LEGEND: { key: string; label: string }[] = [
  { key: "shift-notes", label: "Shift notes" },
  { key: "vendor", label: "Vendor" },
  { key: "training", label: "Training" },
  { key: "incidents", label: "Incidents" },
  { key: "schedules", label: "Schedules" },
  { key: "general", label: "General" },
  { key: "inbox", label: "Inbox" },
  { key: "drive", label: "Live Drive" },
];

interface GraphResponse {
  actor: string;
  demo: boolean;
  driveNodeCount: number;
  nodes: BrainGraphNode[];
  links: BrainGraphLink[];
  drive: {
    live: boolean;
    folderId: string | null;
    folderName: string;
    message: string;
  };
}

export default function BrainMap() {
  const router = useRouter();
  const [data, setData] = useState<GraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<BrainGraphNode | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/brain/api/graph");
    if (res.status === 401 || res.status === 403) {
      router.replace("/brain/login");
      return;
    }
    const payload = await res.json();
    if (!res.ok) {
      setError(payload.error ?? "Could not load the brain map.");
      return;
    }
    setData(payload);
    setError(null);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  const logout = async () => {
    await fetch("/brain/api/logout", { method: "POST" });
    router.replace("/brain/login");
  };

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm font-medium text-slate-600">
          {error ?? "Loading Second Brain map…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/brain" className="btn-secondary bg-white/10 py-2 text-white hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">
              Manager-only · 3D map
            </p>
            <h1 className="text-lg font-bold">Second Brain</h1>
            <p className="text-xs text-slate-400">{data.actor}</p>
          </div>
        </div>
        <button type="button" onClick={() => void logout()} className="btn-secondary py-2">
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <div
        id="drive-status"
        className="flex items-start gap-3 border-b border-amber-900/40 bg-amber-950/40 px-4 py-3"
      >
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
        <div>
          <p className="text-sm font-semibold text-amber-100">
            Drive is not wired{data.drive.folderId ? "" : " (folder id is null)"}
            {data.driveNodeCount === 0 ? " · no Drive nodes on this map" : ""}
          </p>
          <p className="mt-1 text-sm text-amber-200/90">{data.drive.message}</p>
          {data.demo && (
            <p id="map-demo-banner" className="mt-1 text-sm text-amber-100">
              Showing a few demo notes so the graph isn’t empty. They are not Drive files.
            </p>
          )}
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-slate-400">
        Drag to orbit · Scroll to zoom · Click a node to open that note
      </p>

      <div className="relative min-h-0 flex-1 px-4 pb-4">
        <div className="h-[min(70vh,42rem)] min-h-[22rem] lg:h-[calc(100vh-13rem)]">
          <BrainForceGraph
            nodes={data.nodes}
            links={data.links}
            selectedId={selected?.id ?? null}
            onSelect={setSelected}
            onBackgroundClick={() => setSelected(null)}
          />
        </div>

        {selected && (
          <aside
            id="brain-map-note"
            className="absolute bottom-6 right-6 max-h-[min(70vh,32rem)] w-[min(100%-2rem,22rem)] overflow-y-auto rounded-2xl border border-white/15 bg-slate-900/95 p-4 shadow-2xl"
          >
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
              {selected.kind === "drive" ? "Live Drive file" : selected.category ?? selected.status}
              {selected.demo ? " · demo" : ""}
            </p>
            <h2 className="mt-1 text-base font-semibold text-white">{selected.title}</h2>
            {selected.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">{selected.body}</p>
            )}
            {selected.actorEmail && (
              <p className="mt-2 text-[11px] text-slate-500">{selected.actorEmail}</p>
            )}
            {selected.kind === "drive" && selected.url && (
              <a
                href={selected.url}
                className="mt-3 inline-block text-sm font-medium text-sky-300 underline"
                target="_blank"
                rel="noreferrer"
              >
                Open in Drive
              </a>
            )}
            <button
              type="button"
              className="btn-secondary mt-4 w-full"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </aside>
        )}
      </div>

      <ul className="flex flex-wrap gap-3 px-4 pb-6 text-xs text-slate-300">
        {LEGEND.map((item) => (
          <li key={item.key} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ background: MAP_CATEGORY_COLORS[item.key] }}
            />
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
