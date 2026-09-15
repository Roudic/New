"use client";

import { useEffect, useRef } from "react";
import type { BrainGraphLink, BrainGraphNode } from "@/lib/second-brain/graph";
import {
  createSimNodes,
  nodeColor,
  nodeRadius,
  pickProjectedNode,
  projectNodes,
  stepForce,
  type ProjectedNode,
  type SimNode,
} from "@/lib/second-brain/map-view";

interface Props {
  nodes: BrainGraphNode[];
  links: BrainGraphLink[];
  selectedId: string | null;
  onSelect: (node: BrainGraphNode) => void;
  onBackgroundClick: () => void;
}

function hexRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

export default function BrainForceGraph({
  nodes,
  links,
  selectedId,
  onSelect,
  onBackgroundClick,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const simRef = useRef<SimNode[]>([]);
  const linksRef = useRef<BrainGraphLink[]>(links);
  const selectedRef = useRef(selectedId);
  const selectRef = useRef(onSelect);
  const bgRef = useRef(onBackgroundClick);
  const cameraRef = useRef({ yaw: 0.55, pitch: 0.35, distance: 420 });
  const dragRef = useRef<{
    active: boolean;
    moved: boolean;
    x: number;
    y: number;
  }>({ active: false, moved: false, x: 0, y: 0 });
  const projectedRef = useRef<ProjectedNode[]>([]);

  selectRef.current = onSelect;
  bgRef.current = onBackgroundClick;
  selectedRef.current = selectedId;
  linksRef.current = links;

  useEffect(() => {
    const prev: Record<string, SimNode> = {};
    for (let i = 0; i < simRef.current.length; i += 1) {
      prev[simRef.current[i].id] = simRef.current[i];
    }
    const next = createSimNodes(nodes);
    for (let i = 0; i < next.length; i += 1) {
      const old = prev[next[i].id];
      if (!old) continue;
      next[i].x = old.x;
      next[i].y = old.y;
      next[i].z = old.z;
      next[i].vx = old.vx;
      next[i].vy = old.vy;
      next[i].vz = old.vz;
    }
    simRef.current = next;
  }, [nodes]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let running = true;

    let lastW = 0;
    let lastH = 0;
    const size = { width: 640, height: 420 };

    const fit = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(320, host.clientWidth);
      const height = Math.max(240, host.clientHeight);
      if (width !== lastW || height !== lastH) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        lastW = width;
        lastH = height;
      }
      size.width = width;
      size.height = height;
    };

    const draw = () => {
      if (!running) return;
      fit();
      const width = size.width;
      const height = size.height;
      stepForce(simRef.current, linksRef.current, 0.9);
      const cam = cameraRef.current;
      const projected = projectNodes(
        simRef.current,
        cam.yaw,
        cam.pitch,
        cam.distance,
        width,
        height
      );
      projectedRef.current = projected;

      const bg = ctx.createRadialGradient(
        width / 2,
        height / 2,
        20,
        width / 2,
        height / 2,
        Math.max(width, height) * 0.7
      );
      bg.addColorStop(0, "#0f172a");
      bg.addColorStop(1, "#020617");
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      const byId: Record<string, ProjectedNode> = {};
      for (let i = 0; i < projected.length; i += 1) {
        byId[projected[i].node.id] = projected[i];
      }

      for (let i = 0; i < linksRef.current.length; i += 1) {
        const link = linksRef.current[i];
        const a = byId[String(link.source)];
        const b = byId[String(link.target)];
        if (!a || !b) continue;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.strokeStyle =
          link.kind === "drive" ? "rgba(56, 189, 248, 0.55)" : "rgba(148, 163, 184, 0.45)";
        ctx.lineWidth = 1.6;
        ctx.stroke();
      }

      for (let i = 0; i < projected.length; i += 1) {
        const item = projected[i];
        const r = nodeRadius(item.node.data) * Math.max(0.7, item.scale);
        const color = nodeColor(item.node.data, selectedRef.current);
        const [cr, cg, cb] = hexRgb(color);
        const glow = ctx.createRadialGradient(item.sx, item.sy, 1, item.sx, item.sy, r * 2.2);
        glow.addColorStop(0, `rgba(${cr},${cg},${cb},0.95)`);
        glow.addColorStop(0.45, `rgba(${cr},${cg},${cb},0.7)`);
        glow.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(item.sx, item.sy, r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = color;
        ctx.arc(item.sx, item.sy, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = item.node.data.id === selectedRef.current ? 3 : 1;
        ctx.strokeStyle =
          item.node.data.id === selectedRef.current ? "#f8fafc" : "rgba(15,23,42,0.7)";
        ctx.stroke();

        ctx.font = `${Math.max(11, Math.round(12 * Math.min(item.scale, 1.3)))}px ui-sans-serif, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.lineWidth = 4;
        ctx.strokeStyle = "rgba(2,6,23,0.85)";
        ctx.fillStyle = "#e2e8f0";
        const label = item.node.data.title;
        ctx.strokeText(label, item.sx, item.sy + r + 6);
        ctx.fillText(label, item.sx, item.sy + r + 6);
      }

      canvas.dataset.nodeCount = String(simRef.current.length);
      canvas.dataset.populated = simRef.current.length > 0 ? "true" : "false";
      raf = window.requestAnimationFrame(draw);
    };

    const canvasXY = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return { x: event.clientX - rect.left, y: event.clientY - rect.top };
    };

    const onDown = (event: PointerEvent) => {
      dragRef.current = {
        active: true,
        moved: false,
        x: event.clientX,
        y: event.clientY,
      };
      canvas.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!dragRef.current.active) return;
      const dx = event.clientX - dragRef.current.x;
      const dy = event.clientY - dragRef.current.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) dragRef.current.moved = true;
      cameraRef.current.yaw += dx * 0.008;
      cameraRef.current.pitch = Math.max(
        -1.2,
        Math.min(1.2, cameraRef.current.pitch + dy * 0.008)
      );
      dragRef.current.x = event.clientX;
      dragRef.current.y = event.clientY;
    };
    const onUp = (event: PointerEvent) => {
      const drag = dragRef.current;
      dragRef.current.active = false;
      if (drag.moved) return;
      const pt = canvasXY(event);
      const hit = pickProjectedNode(projectedRef.current, pt.x, pt.y);
      if (hit) selectRef.current(hit.data);
      else bgRef.current();
    };
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      cameraRef.current.distance = Math.max(
        180,
        Math.min(900, cameraRef.current.distance + event.deltaY * 0.35)
      );
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", fit);
    raf = window.requestAnimationFrame(draw);

    return () => {
      running = false;
      window.cancelAnimationFrame(raf);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", fit);
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="h-full w-full overflow-hidden rounded-2xl bg-slate-950"
    >
      <canvas
        ref={canvasRef}
        id="brain-map-canvas"
        data-populated="false"
        data-node-count="0"
        className="block h-full w-full cursor-grab touch-none active:cursor-grabbing"
      />
    </div>
  );
}
