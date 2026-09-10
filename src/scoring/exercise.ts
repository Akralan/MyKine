import type { AngleKey } from "../geometry/angles";

/**
 * Sens du mouvement sur l'angle pilote.
 * - `flexion`  : l'angle diminue pendant l'effort (squat, fente) — repos haut, cible basse.
 * - `extension`: l'angle augmente pendant l'effort (pont fessier, élévation) — repos bas, cible haute.
 */
export type MovementDirection = "flexion" | "extension";

/** Zone corporelle, utilisée par les filtres de la bibliothèque. */
export type BodyZone = "genou" | "hanche" | "épaule" | "cheville" | "dos";

/**
 * Maturité de la définition. `draft` = seuils issus de la littérature mais non relus
 * par un kiné, et jamais confrontés à de vraies frames : l'UI l'affiche tel quel
 * plutôt que de faire croire à une valeur validée.
 */
export type ExerciseStatus = "validated" | "draft";

/**
 * Définition paramétrée d'un exercice — l'embryon de la bibliothèque que le kiné
 * prescrit et ajuste. Aucun enregistrement de référence : uniquement des seuils lisibles.
 *
 * CONVENTION D'ANGLE — à lire avant de toucher à un seuil.
 * `jointAngle` renvoie l'angle intérieur entre deux segments, pas l'amplitude clinique
 * mesurée depuis le zéro anatomique. Pour le genou et la hanche :
 *
 *     angle intérieur = 180° − flexion clinique
 *
 * Un genou tendu vaut 180° ici et 0° de flexion en goniométrie ; une flexion clinique
 * de 90° vaut 90° ici aussi (le point fixe de la conversion), une flexion de 117° vaut
 * 63° ici. Pour l'épaule (coude–épaule–hanche), l'angle intérieur EST l'élévation
 * huméro-thoracique : 0° bras le long du corps, 90° à l'horizontale. Pour la cheville
 * (genou–cheville–pointe), il n'existe pas de zéro anatomique correspondant : voir
 * la réserve sur `CALF_RAISE`.
 */
export interface ExerciseDefinition {
  id: string;
  name: string;
  zone: BodyZone;
  status: ExerciseStatus;
  /** Angle pilote de la machine à états (côté gauche et droit). */
  primaryAngle: { left: AngleKey; right: AngleKey };
  direction: MovementDirection;
  /**
   * Seuils sur l'angle pilote (en degrés, convention ci-dessus).
   * - `rest`   : du côté repos, on est en position de départ.
   * - `target` : franchi dans le sens du mouvement, la rep est complète (amplitude atteinte).
   */
  thresholds: { rest: number; target: number };
  /** Durée minimale d'une rep valide (filtre les rebonds du signal). */
  minRepDurationMs: number;
  /**
   * Écart gauche/droite au point extrême qui déclenche une alerte d'asymétrie.
   * `undefined` = la mesure n'a pas de sens pour cet exercice (mouvement unilatéral) :
   * elle n'est ni calculée ni affichée, plutôt que muselée par un seuil énorme.
   */
  asymmetryWarnDeg?: number;
  /**
   * Inclinaison du tronc au-delà de laquelle on signale une compensation.
   * `undefined` = la mesure n'a pas de sens (exercice allongé, où `trunkLean` vaut ~90°
   * en permanence par construction).
   */
  trunkLeanWarnDeg?: number;
  /** Dose utilisée quand l'exercice est lancé hors programme, depuis la bibliothèque. */
  defaultDose: { sets: number; reps: number; holdMs?: number };
  /** Libellé de la mesure d'amplitude, affiché dans les tuiles de mesures. */
  depthLabel: string;
  /** Version abrégée pour les cartes d'historique, où la place manque. */
  depthShort: string;
  /** Exercice travaillé un côté après l'autre : la dose s'entend « par jambe ». */
  unilateral?: boolean;
  /** D'où viennent les seuils. Une définition sans source n'a rien à faire ici. */
  sources: string[];
  /** Consignes affichées au patient. */
  instructions: string[];
}

export const SQUAT: ExerciseDefinition = {
  id: "squat",
  name: "Squat",
  zone: "genou",
  status: "validated",
  primaryAngle: { left: "kneeL", right: "kneeR" },
  direction: "flexion",
  // 100° intérieur = 80° de flexion clinique. Pour repère, le pic mesuré sur un squat
  // unipodal chez l'adulte sain est de 86,7° ± 9,9° de flexion, soit 93° intérieur.
  thresholds: { rest: 160, target: 100 },
  minRepDurationMs: 600,
  asymmetryWarnDeg: 12,
  trunkLeanWarnDeg: 45,
  defaultDose: { sets: 3, reps: 12 },
  depthLabel: "Profondeur",
  depthShort: "prof.",
  sources: [
    "Seuils d'origine du projet, à confirmer sur de vrais squats (docs/journal.md).",
    "Repère de flexion : squat unipodal 86,7° ± 9,9° (n = 9 adultes sains) — PMC4641539.",
  ],
  instructions: [
    "Placez le téléphone à hauteur de hanches, corps entier visible.",
    "Tenez-vous de profil ou de trois-quarts face à la caméra.",
    "Descendez jusqu'à ce que les genoux soient à 90°, puis remontez.",
  ],
};

export const LUNGE: ExerciseDefinition = {
  id: "lunge",
  name: "Fente avant",
  zone: "genou",
  status: "draft",
  primaryAngle: { left: "kneeL", right: "kneeR" },
  direction: "flexion",
  // Cible 90° intérieur = 90° de flexion clinique, le repère de rééducation usuel
  // (« genou avant à 90° »). Le pic mesuré sur fente avant chez l'adulte sain est de
  // 117,3° ± 6,4° de flexion, soit 63° intérieur : une fente ordinaire valide largement.
  thresholds: { rest: 160, target: 90 },
  minRepDurationMs: 700,
  // Mouvement unilatéral : l'écart gauche/droite est la nature de l'exercice, pas un défaut.
  asymmetryWarnDeg: undefined,
  trunkLeanWarnDeg: 30,
  defaultDose: { sets: 3, reps: 10 },
  depthLabel: "Profondeur",
  depthShort: "prof.",
  unilateral: true,
  sources: [
    "Pic de flexion du genou en fente avant : 117,3° ± 6,4° (n = 9 adultes sains) — PMC4641539.",
    "Cible « genou avant à 90° » : repère de rééducation usuel, à confirmer avec les kinés.",
  ],
  instructions: [
    "Placez le téléphone à hauteur de hanches, de profil, corps entier visible.",
    "Avancez une jambe, descendez jusqu'à ce que le genou avant soit à 90°.",
    "Faites toutes les répétitions d'un côté, puis changez de jambe.",
  ],
};

export const GLUTE_BRIDGE: ExerciseDefinition = {
  id: "glute-bridge",
  name: "Pont fessier",
  zone: "hanche",
  status: "draft",
  primaryAngle: { left: "hipL", right: "hipR" },
  direction: "extension",
  // Critère de fin admis : le corps forme une ligne droite épaule–hanche–genou, soit
  // 180° intérieur (extension de hanche à 0°, la position neutre du zéro neutre).
  // Cible fixée à 170° pour laisser 10° de tolérance de mesure plutôt que d'exiger la
  // ligne parfaite. Position de départ (allongé, genoux ~90°, bassin au sol) : 45 à 60°
  // de flexion de hanche, soit 120 à 135° intérieur — d'où un repos à 145°.
  thresholds: { rest: 145, target: 170 },
  minRepDurationMs: 800,
  asymmetryWarnDeg: 12,
  // Allongé, l'inclinaison du tronc par rapport à la verticale vaut ~90° en permanence :
  // la mesure n'a aucun sens ici et n'est pas affichée.
  trunkLeanWarnDeg: undefined,
  defaultDose: { sets: 2, reps: 15, holdMs: 3000 },
  depthLabel: "Extension",
  depthShort: "ext.",
  sources: [
    "Critère de fin « ligne droite épaule–hanche–genou » — Physiopedia, Bridging.",
    "Extension de hanche 0–10° au zéro neutre : la ligne droite est la position neutre.",
    "Départ genoux fléchis à 90°, angle de référence des études sur le pont — PubMed 32567954.",
  ],
  instructions: [
    "Allongez-vous sur le dos, genoux pliés, téléphone posé au sol de profil.",
    "Le corps entier doit rester dans le cadre.",
    "Montez le bassin jusqu'à aligner épaules, hanches et genoux, tenez, puis redescendez.",
  ],
};

export const SHOULDER_RAISE: ExerciseDefinition = {
  id: "shoulder-raise",
  name: "Élévation d'épaule",
  zone: "épaule",
  status: "draft",
  primaryAngle: { left: "shoulderL", right: "shoulderR" },
  direction: "extension",
  // L'angle coude–épaule–hanche est directement l'élévation huméro-thoracique.
  // Les protocoles de rééducation de l'épaule limitent explicitement l'élévation à 90°
  // (l'horizontale) : c'est la cible. Bras le long du corps, on lit 10 à 15° — d'où un
  // repos à 30°, franchement au-dessus du bruit de mesure.
  thresholds: { rest: 30, target: 90 },
  minRepDurationMs: 700,
  asymmetryWarnDeg: 15,
  trunkLeanWarnDeg: 20,
  defaultDose: { sets: 3, reps: 12 },
  depthLabel: "Élévation",
  depthShort: "élév.",
  sources: [
    "Élévation limitée à 90° (l'horizontale) dans les protocoles d'épaule — MGH, HEP for shoulder.",
    "Amplitude d'abduction normale 0–180° (zéro neutre).",
  ],
  instructions: [
    "Placez le téléphone à hauteur de hanches, face à vous, buste entier visible.",
    "Bras le long du corps au départ.",
    "Montez les bras sur le côté jusqu'à l'horizontale, puis redescendez.",
  ],
};

export const CALF_RAISE: ExerciseDefinition = {
  id: "calf-raise",
  name: "Montée sur pointes",
  zone: "cheville",
  status: "draft",
  primaryAngle: { left: "ankleL", right: "ankleR" },
  direction: "extension",
  // RÉSERVE — le seul exercice dont l'origine n'est pas ancrée dans la littérature.
  // L'angle genou–cheville–pointe n'a pas de zéro anatomique correspondant : sa valeur
  // pied à plat dépend du placement du point « pointe de pied » par le modèle, qui est
  // le moins fiable de BlazePose. Le `rest` de 100° est une estimation à recalibrer sur
  // de vraies frames. Seul l'ÉCART cible − repos est sourcé : +25°, borne basse de
  // l'amplitude de flexion plantaire (25–30° selon les sources, 40–50° au zéro neutre).
  thresholds: { rest: 100, target: 125 },
  minRepDurationMs: 500,
  asymmetryWarnDeg: 10,
  trunkLeanWarnDeg: 20,
  defaultDose: { sets: 3, reps: 15 },
  depthLabel: "Amplitude",
  depthShort: "ampl.",
  sources: [
    "Amplitude de flexion plantaire 25–30° — World Physiotherapy, single-leg heel raise.",
    "ORIGINE NON SOURCÉE : la valeur pied à plat doit être calibrée sur de vraies frames.",
  ],
  instructions: [
    "Placez le téléphone au sol, de profil, jambes et pieds bien visibles.",
    "Montez sur la pointe des pieds, marquez un temps d'arrêt, redescendez.",
    "Mesure la plus fragile de la bibliothèque : les pieds sont les points les moins fiables.",
  ],
};

export const EXERCISES: Record<string, ExerciseDefinition> = Object.fromEntries(
  [SQUAT, LUNGE, GLUTE_BRIDGE, SHOULDER_RAISE, CALF_RAISE].map((e) => [e.id, e]),
);

export const EXERCISE_LIST: ExerciseDefinition[] = Object.values(EXERCISES);

/**
 * Signe qui ramène tout mouvement au cas « l'angle descend » traité par la machine à états.
 * En espace transformé, on est toujours au repos au-dessus de `rest` et complet sous `target`.
 */
export function directionSign(def: ExerciseDefinition): 1 | -1 {
  return def.direction === "flexion" ? 1 : -1;
}
