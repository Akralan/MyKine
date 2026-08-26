import type { AngleKey } from "../geometry/angles";

/**
 * Définition paramétrée d'un exercice — l'embryon de la bibliothèque que le kiné
 * prescrit et ajuste. Aucun enregistrement de référence : uniquement des seuils lisibles.
 */
export interface ExerciseDefinition {
  id: string;
  name: string;
  /** Angle pilote de la machine à états (côté gauche et droit, on prend la moyenne). */
  primaryAngle: { left: AngleKey; right: AngleKey };
  /**
   * Seuils sur l'angle pilote (en degrés).
   * - `rest`   : au-dessus, on est en position de départ.
   * - `target` : en dessous, la rep est considérée complète (amplitude atteinte).
   */
  thresholds: { rest: number; target: number };
  /** Durée minimale d'une rep valide (filtre les rebonds du signal). */
  minRepDurationMs: number;
  /** Écart gauche/droite au point bas qui déclenche une alerte d'asymétrie. */
  asymmetryWarnDeg: number;
  /** Inclinaison du tronc au-delà de laquelle on signale une compensation. */
  trunkLeanWarnDeg: number;
  /** Consignes affichées au patient. */
  instructions: string[];
}

export const SQUAT: ExerciseDefinition = {
  id: "squat",
  name: "Squat",
  primaryAngle: { left: "kneeL", right: "kneeR" },
  thresholds: { rest: 160, target: 100 },
  minRepDurationMs: 600,
  asymmetryWarnDeg: 12,
  trunkLeanWarnDeg: 45,
  instructions: [
    "Placez le téléphone à hauteur de hanches, corps entier visible.",
    "Tenez-vous de profil ou de trois-quarts face à la caméra.",
    "Descendez jusqu'à ce que les genoux soient à 90°, puis remontez.",
  ],
};

export const EXERCISES: Record<string, ExerciseDefinition> = { [SQUAT.id]: SQUAT };
