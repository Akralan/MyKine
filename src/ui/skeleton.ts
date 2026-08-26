import { LM, SKELETON_EDGES, normPoint, type Frame } from "../pose/types";

export interface SkeletonStyle {
  /** Miroir horizontal (vue caméra frontale). */
  mirror?: boolean;
  color?: string;
  /** Articulations à surligner (ex. genoux) avec leur couleur. */
  highlight?: Map<number, string>;
}

/**
 * Dessine une frame en bâtons sur un canvas. Les coordonnées normalisées sont
 * projetées sur la taille du canvas ; le squelette est donc indépendant de la vidéo.
 */
export function drawSkeleton(ctx: CanvasRenderingContext2D, frame: Frame, style: SkeletonStyle = {}): void {
  const { width: w, height: h } = ctx.canvas;
  const color = style.color ?? "#4ade80";
  const px = (i: number) => {
    const p = normPoint(frame, i);
    return { x: (style.mirror ? 1 - p.x : p.x) * w, y: p.y * h, v: p.visibility };
  };

  ctx.lineWidth = Math.max(2, w / 240);
  ctx.lineCap = "round";
  ctx.strokeStyle = color;
  for (const [a, b] of SKELETON_EDGES) {
    const pa = px(a), pb = px(b);
    if (pa.v < 0.4 || pb.v < 0.4) continue;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }

  const radius = Math.max(3, w / 160);
  for (let i = 0; i < 33; i++) {
    if (i > 0 && i < 11) continue; // on n'affiche pas les points du visage
    const p = px(i);
    if (p.v < 0.4) continue;
    ctx.fillStyle = style.highlight?.get(i) ?? color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, style.highlight?.has(i) ? radius * 1.6 : radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const KNEE_HIGHLIGHT = new Map<number, string>([
  [LM.LEFT_KNEE, "#f97316"],
  [LM.RIGHT_KNEE, "#38bdf8"],
]);

/** Interpole deux frames pour un scrub fluide entre deux échantillons. */
export function lerpFrame(a: Frame, b: Frame, k: number): Frame {
  const norm = new Float32Array(a.norm.length);
  const world = new Float32Array(a.world.length);
  for (let i = 0; i < norm.length; i++) norm[i] = a.norm[i]! + (b.norm[i]! - a.norm[i]!) * k;
  for (let i = 0; i < world.length; i++) world[i] = a.world[i]! + (b.world[i]! - a.world[i]!) * k;
  return { t: a.t + (b.t - a.t) * k, norm, world };
}

/** Frame (interpolée) au temps t d'une séquence triée par t. */
export function frameAt(frames: Frame[], t: number): Frame | null {
  if (frames.length === 0) return null;
  if (t <= frames[0]!.t) return frames[0]!;
  const last = frames[frames.length - 1]!;
  if (t >= last.t) return last;
  let lo = 0, hi = frames.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (frames[mid]!.t <= t) lo = mid;
    else hi = mid;
  }
  const a = frames[lo]!, b = frames[hi]!;
  return lerpFrame(a, b, (t - a.t) / (b.t - a.t));
}
