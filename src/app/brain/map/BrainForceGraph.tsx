"use client";

import { useEffect, useRef } from "react";
import type { ForceGraph3DInstance } from "3d-force-graph";
import type { BrainGraphLink, BrainGraphNode } from "@/lib/second-brain/graph";
import { MAP_CATEGORY_COLORS } from "@/lib/second-brain/graph";

interface Props {
  nodes: BrainGraphNode[];
  links: BrainGraphLink[];
  selectedId: string | null;
  onSelect: (node: BrainGraphNode) => void;
  onBackgroundClick: () => void;
}

function asNode(node: object): BrainGraphNode {
  return node as BrainGraphNode;
}

function asLink(link: object): BrainGraphLink {
  return link as BrainGraphLink;
}

function colorFor(node: BrainGraphNode, selectedId: string | null): string {
  if (node.id === selectedId) return "#f8fafc";
  return MAP_CATEGORY_COLORS[node.group] ?? "#94a3b8";
}

export default function BrainForceGraph({
  nodes,
  links,
  selectedId,
  onSelect,
  onBackgroundClick,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraph3DInstance | null>(null);
  const selectRef = useRef(onSelect);
  const bgRef = useRef(onBackgroundClick);
  const selectedRef = useRef(selectedId);
  selectRef.current = onSelect;
  bgRef.current = onBackgroundClick;
  selectedRef.current = selectedId;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    let onResize: (() => void) | undefined;

    void (async () => {
      const { default: ForceGraph3D } = await import("3d-force-graph");
      if (cancelled || !hostRef.current) return;
      const canvas = hostRef.current;
      const graph = new ForceGraph3D(canvas, { controlType: "orbit" })
        .width(canvas.clientWidth || 640)
        .height(canvas.clientHeight || 420)
        .backgroundColor("#020617")
        .showNavInfo(false)
        .nodeId("id")
        .nodeLabel((node) => {
          const item = asNode(node);
          const kind = item.kind === "drive" ? "Drive" : item.category ?? item.status ?? "note";
          return `${item.title}\n${kind}`;
        })
        .nodeColor((node) => colorFor(asNode(node), selectedRef.current))
        .nodeVal((node) => {
          const item = asNode(node);
          if (item.kind === "drive") return 10;
          if (item.status === "filed") return 8;
          if (item.status === "needs-review") return 6;
          return 4;
        })
        .nodeOpacity(0.94)
        .linkColor((link) => (asLink(link).kind === "drive" ? "#38bdf8" : "#94a3b8"))
        .linkOpacity(0.5)
        .linkWidth(1.2)
        .linkDirectionalParticles(2)
        .linkDirectionalParticleWidth(1.2)
        .onNodeClick((node) => {
          selectRef.current(asNode(node));
        })
        .onBackgroundClick(() => {
          bgRef.current();
        })
        .graphData({ nodes: nodes.slice(), links: links.slice() });

      graphRef.current = graph;
      onResize = () => {
        if (!hostRef.current || !graphRef.current) return;
        graphRef.current.width(hostRef.current.clientWidth).height(hostRef.current.clientHeight);
      };
      window.addEventListener("resize", onResize);
    })();

    return () => {
      cancelled = true;
      if (onResize) window.removeEventListener("resize", onResize);
      graphRef.current?._destructor();
      graphRef.current = null;
      if (host) host.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    graphRef.current?.graphData({ nodes: nodes.slice(), links: links.slice() });
  }, [nodes, links]);

  useEffect(() => {
    graphRef.current?.nodeColor((node) => colorFor(asNode(node), selectedRef.current));
  }, [selectedId]);

  return (
    <div
      ref={hostRef}
      id="brain-map-canvas"
      className="h-full w-full overflow-hidden rounded-2xl bg-slate-950"
    />
  );
}
