/**
 * Modèle de données indépendant du moteur de pose estimation.
 * Tout ce qui est en aval (angles, scoring, replay, stockage) ne dépend que de ceci.
 */

/** Nombre de points du squelette (topologie BlazePose 33 points). */
export const LANDMARK_COUNT = 33;

/** Indices des points articulaires utiles (topologie BlazePose). */
export const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
  LEFT_HEEL: 29,
  RIGHT_HEEL: 30,
  LEFT_FOOT_INDEX: 31,
  RIGHT_FOOT_INDEX: 32,
} as const;

/** Segments à dessiner pour le squelette (paires d'indices). */
export const SKELETON_EDGES: ReadonlyArray<readonly [number, number]> = [
  [11, 12],
  [11, 13], [13, 15],
  [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24],
  [23, 25], [25, 27], [27, 29], [27, 31],
  [24, 26], [26, 28], [28, 30], [28, 32],
];

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Une frame de pose.
 * - `norm` : 33 × (x, y, z, visibility), coordonnées normalisées image [0,1] — pour le dessin.
 * - `world` : 33 × (x, y, z) en mètres, origine au centre des hanches — pour les angles.
 * Stockées en Float32Array pour rester compactes dans IndexedDB.
 */
export interface Frame {
  /** Temps en ms depuis le début de la séance. */
  t: number;
  norm: Float32Array;
  world: Float32Array;
}

export function worldPoint(frame: Frame, index: number): Vec3 {
  const i = index * 3;
  return { x: frame.world[i]!, y: frame.world[i + 1]!, z: frame.world[i + 2]! };
}

export function normPoint(frame: Frame, index: number): Vec3 & { visibility: number } {
  const i = index * 4;
  return {
    x: frame.norm[i]!,
    y: frame.norm[i + 1]!,
    z: frame.norm[i + 2]!,
    visibility: frame.norm[i + 3]!,
  };
}

/** Source de frames : caméra live, ou fichier rejoué. Le scoring ne voit que ça. */
export interface PoseSource {
  start(onFrame: (frame: Frame) => void): Promise<void>;
  stop(): void;
}
