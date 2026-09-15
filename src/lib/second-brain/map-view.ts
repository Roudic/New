import type { BrainGraphLink, BrainGraphNode } from "./graph";
import { MAP_CATEGORY_COLORS } from "./graph";

export interface SimNode {
  id: string;
  data: BrainGraphNode;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

export interface ProjectedNode {
  node: SimNode;
  sx: number;
  sy: number;
  scale: number;
  depth: number;
}

export function nodeColor(node: BrainGraphNode, selectedId: string | null): string {
  if (node.id === selectedId) return "#f8fafc";
  return MAP_CATEGORY_COLORS[node.group] ?? "#94a3b8";
}

export function nodeRadius(node: BrainGraphNode): number {
  if (node.kind === "drive") return 16;
  if (node.status === "filed") return 14;
  if (node.status === "needs-review") return 12;
  return 10;
}

/** Evenly distribute points on a sphere so clusters are visible immediately. */
export function fibonacciSphere(count: number, radius: number): { x: number; y: number; z: number }[] {
  const points: { x: number; y: number; z: number }[] = [];
  if (count <= 0) return points;
  if (count === 1) {
    points.push({ x: 0, y: 0, z: 0 });
    return points;
  }
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }
  return points;
}

export function createSimNodes(nodes: BrainGraphNode[]): SimNode[] {
  const seeds = fibonacciSphere(nodes.length, 150);
  const sim: SimNode[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    const seed = seeds[i] ?? { x: 0, y: 0, z: 0 };
    sim.push({
      id: nodes[i].id,
      data: nodes[i],
      x: seed.x,
      y: seed.y,
      z: seed.z,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  }
  return sim;
}

function simById(nodes: SimNode[]): Record<string, SimNode> {
  const map: Record<string, SimNode> = {};
  for (let i = 0; i < nodes.length; i += 1) {
    map[nodes[i].id] = nodes[i];
  }
  return map;
}

export function stepForce(nodes: SimNode[], links: BrainGraphLink[], dt: number): void {
  const repulsion = 2200;
  const spring = 0.035;
  const rest = 110;
  const center = 0.012;
  const damp = 0.86;

  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i];
      const b = nodes[j];
      let dx = a.x - b.x;
      let dy = a.y - b.y;
      let dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const force = (repulsion / (dist * dist)) * dt;
      dx = (dx / dist) * force;
      dy = (dy / dist) * force;
      dz = (dz / dist) * force;
      a.vx += dx;
      a.vy += dy;
      a.vz += dz;
      b.vx -= dx;
      b.vy -= dy;
      b.vz -= dz;
    }
  }

  const byId = simById(nodes);
  for (let i = 0; i < links.length; i += 1) {
    const left = byId[String(links[i].source)];
    const right = byId[String(links[i].target)];
    if (!left || !right) continue;
    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const dz = right.z - left.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
    const pull = ((dist - rest) * spring) * dt;
    const ux = (dx / dist) * pull;
    const uy = (dy / dist) * pull;
    const uz = (dz / dist) * pull;
    left.vx += ux;
    left.vy += uy;
    left.vz += uz;
    right.vx -= ux;
    right.vy -= uy;
    right.vz -= uz;
  }

  for (let i = 0; i < nodes.length; i += 1) {
    const n = nodes[i];
    n.vx += -n.x * center * dt;
    n.vy += -n.y * center * dt;
    n.vz += -n.z * center * dt;
    n.vx *= damp;
    n.vy *= damp;
    n.vz *= damp;
    n.x += n.vx;
    n.y += n.vy;
    n.z += n.vz;
  }
}

export function rotatePoint(
  x: number,
  y: number,
  z: number,
  yaw: number,
  pitch: number
): { x: number; y: number; z: number } {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const rx = x * cy - z * sy;
  const rz = x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return {
    x: rx,
    y: y * cp - rz * sp,
    z: y * sp + rz * cp,
  };
}

export function projectNodes(
  nodes: SimNode[],
  yaw: number,
  pitch: number,
  distance: number,
  width: number,
  height: number
): ProjectedNode[] {
  const projected: ProjectedNode[] = [];
  const focal = Math.min(width, height) * 0.9;
  for (let i = 0; i < nodes.length; i += 1) {
    const rot = rotatePoint(nodes[i].x, nodes[i].y, nodes[i].z, yaw, pitch);
    const depth = rot.z + distance;
    const scale = focal / Math.max(80, depth);
    projected.push({
      node: nodes[i],
      sx: width / 2 + rot.x * scale,
      sy: height / 2 + rot.y * scale,
      scale,
      depth,
    });
  }
  projected.sort((a, b) => b.depth - a.depth);
  return projected;
}

export function pickProjectedNode(
  projected: ProjectedNode[],
  mx: number,
  my: number
): SimNode | null {
  let best: ProjectedNode | null = null;
  for (let i = 0; i < projected.length; i += 1) {
    const item = projected[i];
    const r = nodeRadius(item.node.data) * item.scale * 1.35;
    const dx = mx - item.sx;
    const dy = my - item.sy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > r) continue;
    if (
      !best ||
      item.depth < best.depth ||
      (item.depth === best.depth && dist < Math.hypot(mx - best.sx, my - best.sy))
    ) {
      best = item;
    }
  }
  return best ? best.node : null;
}
