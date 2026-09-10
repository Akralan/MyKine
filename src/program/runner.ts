import { EXERCISES, type ExerciseDefinition } from "../scoring/exercise";
import type { Dose, Program } from "./types";
import { doseOf } from "./progress";

/** Un exercice à faire dans la séance en cours, avec sa dose. */
export interface WorkoutItem {
  def: ExerciseDefinition;
  dose: Dose;
}

/**
 * Séance en cours : une suite d'exercices, chacun en plusieurs séries.
 * Une série terminée = une entrée en base, toutes partageant `id` comme `workoutId`.
 */
export interface Workout {
  id: string;
  items: WorkoutItem[];
  /** Index de l'exercice en cours. */
  index: number;
  /** Ids des séances enregistrées, par exercice. */
  saved: string[][];
  /** Lancée depuis la bibliothèque plutôt que depuis le programme du jour. */
  standalone: boolean;
}

function newWorkout(items: WorkoutItem[], standalone: boolean): Workout {
  return { id: crypto.randomUUID(), items, index: 0, saved: items.map(() => []), standalone };
}

/** Séance du jour : tous les exercices du programme qui ont une définition connue. */
export function workoutFromProgram(program: Program): Workout {
  const items = program.plan
    .map((p) => ({ def: EXERCISES[p.exerciseId], dose: doseOf(p) }))
    .filter((x): x is WorkoutItem => x.def !== undefined);
  return newWorkout(items, false);
}

/**
 * Séance d'un seul exercice, lancée depuis la bibliothèque. La dose prescrite prime
 * si l'exercice est au programme ; sinon on retombe sur la dose par défaut de l'exercice.
 */
export function workoutForExercise(def: ExerciseDefinition, program?: Program): Workout {
  const prescribed = program?.plan.find((p) => p.exerciseId === def.id);
  return newWorkout([{ def, dose: prescribed ? doseOf(prescribed) : { ...def.defaultDose } }], true);
}

export function currentItem(w: Workout): WorkoutItem | undefined {
  return w.items[w.index];
}

export function hasNext(w: Workout): boolean {
  return w.index + 1 < w.items.length;
}

/** Noms des exercices restants après celui en cours — le « Prochaine étape » de l'écran de fin. */
export function remainingNames(w: Workout): string[] {
  return w.items.slice(w.index + 1).map((i) => i.def.name);
}

/** Amplitude cible effective : celle du kiné si elle existe, sinon celle de l'exercice. */
export function targetOf(item: WorkoutItem): number {
  return item.dose.targetDeg ?? item.def.thresholds.target;
}

/**
 * Définition à utiliser pour le scoring : l'exercice de la bibliothèque, avec la cible
 * du kiné substituée si la prescription en fixe une. Le reste du code n'a alors qu'un
 * seul objet à manipuler et ne peut pas oublier la personnalisation.
 */
export function effectiveDef(item: WorkoutItem): ExerciseDefinition {
  const target = targetOf(item);
  return target === item.def.thresholds.target
    ? item.def
    : { ...item.def, thresholds: { ...item.def.thresholds, target } };
}
