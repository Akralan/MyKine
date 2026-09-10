import type { BodyZone } from "../scoring/exercise";

/** Une ligne de prescription : un exercice et sa dose. */
export interface Prescription {
  exerciseId: string;
  sets: number;
  reps: number;
  /** Tenue en position haute, pour les exercices qui en demandent une (pont fessier). */
  holdMs?: number;
  /** Amplitude cible propre à ce patient, si le kiné veut s'écarter du seuil de l'exercice. */
  targetDeg?: number;
}

/**
 * Un programme prescrit. Structure volontairement sérialisable : aujourd'hui c'est une
 * constante (`DEMO_PROGRAM`), demain c'est ce que renvoie l'interface kiné. Rien d'autre
 * dans l'app ne doit coder en dur une dose, une zone ou une durée de programme.
 */
export interface Program {
  id: string;
  /** Libellé affiché sur la carte du jour, ex. « Genou · Semaine 3 ». */
  label: string;
  zone: BodyZone;
  /** Date de début, en ISO (AAAA-MM-JJ). */
  startedOn: string;
  weeks: number;
  sessionsPerWeek: number;
  /** Durée estimée d'une séance, affichée sur la carte du jour. */
  estimatedMinutes: number;
  plan: Prescription[];
}

/** Dose effective d'un exercice pendant une séance. */
export interface Dose {
  sets: number;
  reps: number;
  holdMs?: number;
  targetDeg?: number;
}
