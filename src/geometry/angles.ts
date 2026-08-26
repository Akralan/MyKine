import { LM, worldPoint, type Frame, type Vec3 } from "../pose/types";

/** Angle ABC (au sommet B) en degrés, à partir de trois points 3D. */
export function jointAngle(a: Vec3, b: Vec3, c: Vec3): number {
  const bax = a.x - b.x, bay = a.y - b.y, baz = a.z - b.z;
  const bcx = c.x - b.x, bcy = c.y - b.y, bcz = c.z - b.z;
  const dot = bax * bcx + bay * bcy + baz * bcz;
  const na = Math.hypot(bax, bay, baz);
  const nc = Math.hypot(bcx, bcy, bcz);
  if (na === 0 || nc === 0) return NaN;
  const cos = Math.min(1, Math.max(-1, dot / (na * nc)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/** Angle en degrés entre le segment from→to et la verticale (0 = parfaitement vertical). */
export function leanFromVertical(from: Vec3, to: Vec3): number {
  const dx = to.x - from.x, dy = to.y - from.y, dz = to.z - from.z;
  const len = Math.hypot(dx, dy, dz);
  if (len === 0) return NaN;
  return (Math.acos(Math.min(1, Math.abs(dy) / len)) * 180) / Math.PI;
}

function mid(a: Vec3, b: Vec3): Vec3 {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
}

/** Angles articulaires calculés pour une frame. Les clés sont utilisées par les définitions d'exercice. */
export interface JointAngles {
  kneeL: number;
  kneeR: number;
  hipL: number;
  hipR: number;
  /** Inclinaison du tronc (hanches → épaules) par rapport à la verticale. */
  trunkLean: number;
}

export type AngleKey = keyof JointAngles;

export function computeAngles(frame: Frame): JointAngles {
  const p = (i: number) => worldPoint(frame, i);
  const shL = p(LM.LEFT_SHOULDER), shR = p(LM.RIGHT_SHOULDER);
  const hipL = p(LM.LEFT_HIP), hipR = p(LM.RIGHT_HIP);
  const kneeL = p(LM.LEFT_KNEE), kneeR = p(LM.RIGHT_KNEE);
  const ankL = p(LM.LEFT_ANKLE), ankR = p(LM.RIGHT_ANKLE);

  return {
    kneeL: jointAngle(hipL, kneeL, ankL),
    kneeR: jointAngle(hipR, kneeR, ankR),
    hipL: jointAngle(shL, hipL, kneeL),
    hipR: jointAngle(shR, hipR, kneeR),
    trunkLean: leanFromVertical(mid(hipL, hipR), mid(shL, shR)),
  };
}

/**
 * Lissage exponentiel des angles : la pose estimation est bruitée frame à frame,
 * et un compteur de reps sur des seuils a besoin d'un signal propre.
 */
export class AngleSmoother {
  private prev: JointAngles | null = null;
  constructor(private readonly alpha = 0.5) {}

  next(a: JointAngles): JointAngles {
    if (!this.prev) {
      this.prev = { ...a };
      return this.prev;
    }
    const out = { ...this.prev };
    for (const k of Object.keys(a) as AngleKey[]) {
      const v = a[k];
      if (Number.isNaN(v)) continue;
      const pv = out[k];
      out[k] = Number.isNaN(pv) ? v : pv + this.alpha * (v - pv);
    }
    this.prev = out;
    return out;
  }

  reset(): void {
    this.prev = null;
  }
}
