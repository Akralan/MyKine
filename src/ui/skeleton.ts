import { LM, SKELETON_EDGES, normPoint, worldPoint, type Frame } from "../pose/types";

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
  const color = style.color ?? "#2dd4bf";
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

export interface Orbit {
  /** Rotation autour de l'axe vertical, en radians. */
  yaw: number;
  /** Inclinaison haut/bas, en radians. */
  pitch: number;
}

/**
 * Dessine une frame en 3D (coordonnées monde, en mètres, origine aux hanches)
 * en projection orthographique après rotation. Le sol et les axes donnent le repère.
 */
export function drawSkeleton3D(ctx: CanvasRenderingContext2D, frame: Frame, orbit: Orbit, style: SkeletonStyle = {}): void {
  const { width: w, height: h } = ctx.canvas;
  const color = style.color ?? "#2dd4bf";
  const scale = h / 2.2; // ≈ 2,2 m de hauteur visible
  const cx = w / 2, cy = h / 2;
  const cosY = Math.cos(orbit.yaw), sinY = Math.sin(orbit.yaw);
  const cosP = Math.cos(orbit.pitch), sinP = Math.sin(orbit.pitch);

  // Les coordonnées monde sont recentrées sur les hanches à chaque frame : pendant un squat,
  // ce seraient les pieds qui montent. On ancre donc le squelette au milieu des chevilles,
  // posé sur le sol — translation pure, les angles et l'inclinaison sont inchangés.
  const ankL = worldPoint(frame, LM.LEFT_ANKLE), ankR = worldPoint(frame, LM.RIGHT_ANKLE);
  const anchor = { x: (ankL.x + ankR.x) / 2, y: Math.max(ankL.y, ankR.y), z: (ankL.z + ankR.z) / 2 };
  const floorY = 0.9; // hauteur du sol sous le centre de la scène, en mètres

  // Repère scène : x droite, y bas, z vers la caméra (convention MediaPipe). Rotation autour de y puis de x.
  const view = (x: number, y: number, z: number) => {
    const rx = x * cosY + z * sinY;
    const rz = -x * sinY + z * cosY;
    const ry = y * cosP - rz * sinP;
    const rz2 = y * sinP + rz * cosP;
    return { x: cx + rx * scale, y: cy + ry * scale, depth: rz2 };
  };
  const project = (wx: number, wy: number, wz: number) => view(wx - anchor.x, wy - anchor.y + floorY, wz - anchor.z);

  // Sol : grille en coordonnées scène, au niveau des chevilles
  ctx.strokeStyle = "rgba(148,163,184,0.25)";
  ctx.lineWidth = 1;
  for (let i = -3; i <= 3; i++) {
    const a = view(i * 0.3, floorY, -0.9), b = view(i * 0.3, floorY, 0.9);
    const c = view(-0.9, floorY, i * 0.3), d = view(0.9, floorY, i * 0.3);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
  }

  const pts: { x: number; y: number; depth: number }[] = [];
  for (let i = 0; i < 33; i++) {
    const p = worldPoint(frame, i);
    pts.push(project(p.x, p.y, p.z));
  }

  ctx.lineWidth = Math.max(2, w / 240);
  ctx.lineCap = "round";
  for (const [a, b] of SKELETON_EDGES) {
    const pa = pts[a]!, pb = pts[b]!;
    // Segments plus proches de la caméra dessinés plus opaques : indice de profondeur
    const near = Math.max(0, Math.min(1, 0.5 + (pa.depth + pb.depth) / 2));
    ctx.globalAlpha = 0.45 + 0.55 * near;
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.moveTo(pa.x, pa.y);
    ctx.lineTo(pb.x, pb.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  const radius = Math.max(3, w / 160);
  for (let i = 0; i < 33; i++) {
    if (i > 0 && i < 11) continue;
    const p = pts[i]!;
    ctx.fillStyle = style.highlight?.get(i) ?? color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, style.highlight?.has(i) ? radius * 1.6 : radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Genoux surlignés : repères de latéralité, dans la palette du design system. */
export const KNEE_HIGHLIGHT = new Map<number, string>([
  [LM.LEFT_KNEE, "#fdba74"],
  [LM.RIGHT_KNEE, "#ffffff"],
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
