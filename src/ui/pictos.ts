/**
 * Pictogrammes d'exercice : un squelette en bâtons dans la position clé du mouvement,
 * dans le même langage que le replay. Remplacent les emplacements « photo exercice »
 * de la maquette tant qu'il n'y a pas de vraies vidéos de démonstration.
 *
 * Grille 64 × 64. Chaque figure = des segments (os) et des articulations.
 */

type P = [number, number];

interface Figure {
  head: P;
  bones: P[][];
  joints: P[];
  floor?: number;
}

const FIGURES: Record<string, Figure> = {
  // Vue de profil, cuisses proches de l'horizontale, bras tendus devant.
  squat: {
    head: [37, 13],
    bones: [
      [[33, 20], [25, 35], [39, 40], [35, 53], [41, 53]],
      [[33, 21], [47, 25]],
    ],
    joints: [[33, 20], [25, 35], [39, 40], [35, 53], [47, 25]],
    floor: 54,
  },
  // Genou avant à 90°, genou arrière proche du sol.
  lunge: {
    head: [31, 10],
    bones: [
      [[31, 17], [31, 33]],
      [[31, 33], [42, 38], [42, 52], [47, 52]],
      [[31, 33], [24, 45], [13, 50], [11, 53]],
      [[31, 19], [29, 30]],
    ],
    joints: [[31, 17], [31, 33], [42, 38], [42, 52], [24, 45], [13, 50]],
    floor: 54,
  },
  // Allongé, bassin levé : épaule, hanche et genou alignés.
  "glute-bridge": {
    head: [9, 45],
    bones: [
      [[15, 48], [33, 37], [44, 31], [49, 50], [54, 50]],
      [[15, 49], [27, 51]],
    ],
    joints: [[15, 48], [33, 37], [44, 31], [49, 50]],
    floor: 52,
  },
  // De face, bras écartés à l'horizontale.
  "shoulder-raise": {
    head: [32, 10],
    bones: [
      [[24, 19], [40, 19]],
      [[24, 19], [27, 36], [37, 36], [40, 19]],
      [[27, 36], [26, 53]],
      [[37, 36], [38, 53]],
      [[24, 19], [7, 19]],
      [[40, 19], [57, 19]],
    ],
    joints: [[24, 19], [40, 19], [27, 36], [37, 36], [7, 19], [57, 19], [15, 19], [49, 19]],
    floor: 54,
  },
  // De profil, talons levés.
  "calf-raise": {
    head: [31, 8],
    bones: [
      [[31, 15], [31, 33], [32, 44], [33, 51], [39, 55]],
      [[31, 17], [29, 31]],
    ],
    joints: [[31, 15], [31, 33], [32, 44], [33, 51]],
    floor: 56,
  },
};

/** SVG du pictogramme d'un exercice, ou une silhouette debout s'il n'en a pas. */
export function picto(exerciseId: string): string {
  const f = FIGURES[exerciseId] ?? FIGURES["calf-raise"]!;
  const line = (pts: P[]) => `M${pts.map((p) => p.join(",")).join("L")}`;
  return `<svg class="picto" viewBox="0 0 64 64" aria-hidden="true">
    ${f.floor ? `<line x1="4" x2="60" y1="${f.floor + 2}" y2="${f.floor + 2}" class="picto-floor" />` : ""}
    <path d="${f.bones.map(line).join("")}" class="picto-bone" />
    ${f.joints.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.2" class="picto-joint" />`).join("")}
    <circle cx="${f.head[0]}" cy="${f.head[1]}" r="4.6" class="picto-head" />
  </svg>`;
}
