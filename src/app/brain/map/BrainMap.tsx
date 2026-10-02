"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Brain, ShieldAlert } from "lucide-react";
import { BRAIN_LOGIN_ENABLED } from "@/lib/second-brain/brain-login";
import { MAP_CATEGORY_COLORS } from "@/lib/second-brain/design-tokens";
import BrainOpenBanner from "../BrainOpenBanner";
import type { BrainGraphLink, BrainGraphNode } from "@/lib/second-brain/graph";

const BrainForceGraph = dynamic(() => import("./BrainForceGraph"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-[var(--brain-cream)]/60">
      Loading brain map…
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
    if (BRAIN_LOGIN_ENABLED && (res.status === 401 || res.status === 403)) {
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
    if (!BRAIN_LOGIN_ENABLED) return;
    await fetch("/brain/api/logout", { method: "POST" });
    router.replace("/brain/login");
  };

  if (!data) {
    return (
      <div className="brain-shell brain-shell--night flex min-h-screen items-center justify-center">
        <p className="text-sm font-medium text-[var(--brain-cream)]/70">
          {error ?? "Loading Second Brain map…"}
        </p>
      </div>
    );
  }

  return (
    <div className="brain-shell brain-shell--night flex min-h-screen flex-col">
      <header className="z-10 flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/brain" className="brain-btn brain-btn--night py-2">
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Link>
          <div className="brain-mark brain-mark--night" aria-hidden="true">
            <Brain className="h-5 w-5" />
          </div>
          <div>
            <p className="brain-kicker">Manager-only · brain model</p>
            <h1 className="brain-display text-xl text-[var(--brain-cream)]">Second Brain</h1>
            <p className="text-xs text-[var(--brain-cream)]/55">{data.actor}</p>
          </div>
        </div>
        {BRAIN_LOGIN_ENABLED && (
          <button type="button" onClick={() => void logout()} className="brain-btn brain-btn--night py-2">
            Sign out
          </button>
        )}
      </header>

      <BrainOpenBanner dark />

      <div id="drive-status" className="brain-banner brain-banner--warn-night">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#f0b429]" />
        <div>
          <p className="text-sm font-extrabold">
            Drive is not wired{data.drive.folderId ? "" : " (folder id is null)"}
            {data.driveNodeCount === 0 ? " · no Drive nodes on this map" : ""}
          </p>
          <p className="mt-1 text-sm opacity-90">{data.drive.message}</p>
          {data.demo && (
            <p id="map-demo-banner" className="mt-1 text-sm">
              Showing a few demo notes so the graph isn’t empty. They are not Drive files.
            </p>
          )}
        </div>
      </div>

      <p className="px-4 py-2 text-xs text-[var(--brain-cream)]/50">
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
          <aside id="brain-map-note" className="brain-map-note">
            <p className="brain-kicker">
              {selected.kind === "drive" ? "Live Drive file" : selected.category ?? selected.status}
              {selected.demo ? " · demo" : ""}
            </p>
            <h2 className="brain-display mt-1 text-lg text-white">{selected.title}</h2>
            {selected.body && (
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-[var(--brain-cream)]/80">
                {selected.body}
              </p>
            )}
            {selected.actorEmail && (
              <p className="mt-2 text-[11px] text-[var(--brain-cream)]/45">{selected.actorEmail}</p>
            )}
            {selected.kind === "drive" && selected.url && (
              <a
                href={selected.url}
                className="mt-3 inline-block text-sm font-semibold text-[var(--brain-drive)] underline"
                target="_blank"
                rel="noreferrer"
              >
                Open in Drive
              </a>
            )}
            <button type="button" className="brain-btn brain-btn--night mt-4 w-full" onClick={() => setSelected(null)}>
              Close
            </button>
          </aside>
        )}
      </div>

      <ul className="flex flex-wrap gap-3 px-4 pb-6 text-xs text-[var(--brain-cream)]/75">
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
