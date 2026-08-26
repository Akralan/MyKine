import type { JointAngles } from "../geometry/angles";
import type { ExerciseDefinition } from "./exercise";

/** Résumé d'une répétition terminée. */
export interface Rep {
  index: number;
  tStart: number;
  tEnd: number;
  /** Angle pilote minimal atteint (plus petit = plus profond). */
  minAngle: number;
  /** Écart |gauche − droite| de l'angle pilote au point bas. */
  asymmetryAtBottom: number;
  /** Inclinaison maximale du tronc pendant la rep. */
  maxTrunkLean: number;
  /** Amplitude cible atteinte ? */
  complete: boolean;
}

export type Phase = "rest" | "down" | "up";

/** État exposé à l'UI à chaque frame. */
export interface LiveMetrics {
  phase: Phase;
  primaryAngle: number;
  asymmetry: number;
  trunkLean: number;
  /** Profondeur atteinte sur la rep en cours (angle min). */
  currentMinAngle: number | null;
  reps: Rep[];
  warnings: { asymmetry: boolean; trunkLean: boolean };
}

/**
 * Machine à états déterministe : rest → down → up → rest.
 * Une rep est comptée quand l'angle pilote redépasse `rest` après être passé sous `target`.
 * Une descente qui ne va pas jusqu'à `target` est une rep incomplète (comptée à part).
 */
export class RepCounter {
  private phase: Phase = "rest";
  private tStart = 0;
  private minAngle = Infinity;
  private asymAtMin = 0;
  private maxLean = 0;
  private reps: Rep[] = [];

  constructor(private readonly def: ExerciseDefinition) {}

  update(t: number, a: JointAngles): LiveMetrics {
    const { left, right } = this.def.primaryAngle;
    const l = a[left], r = a[right];
    const primary = Number.isNaN(l) ? r : Number.isNaN(r) ? l : (l + r) / 2;
    const asym = Number.isNaN(l) || Number.isNaN(r) ? 0 : Math.abs(l - r);
    const lean = Number.isNaN(a.trunkLean) ? 0 : a.trunkLean;
    const { rest, target } = this.def.thresholds;

    if (!Number.isNaN(primary)) {
      switch (this.phase) {
        case "rest":
          if (primary < rest) {
            this.phase = "down";
            this.tStart = t;
            this.minAngle = primary;
            this.asymAtMin = asym;
            this.maxLean = lean;
          }
          break;
        case "down":
          if (primary < this.minAngle) {
            this.minAngle = primary;
            this.asymAtMin = asym;
          }
          this.maxLean = Math.max(this.maxLean, lean);
          // On considère la remontée entamée dès qu'on s'éloigne nettement du point bas.
          if (primary > this.minAngle + 10) this.phase = "up";
          break;
        case "up":
          this.maxLean = Math.max(this.maxLean, lean);
          if (primary < this.minAngle) {
            // Re-descente sans être repassé par le repos : on reste sur la même rep.
            this.phase = "down";
            this.minAngle = primary;
            this.asymAtMin = asym;
          } else if (primary >= rest) {
            this.finishRep(t);
          }
          break;
      }
    }

    return {
      phase: this.phase,
      primaryAngle: primary,
      asymmetry: asym,
      trunkLean: lean,
      currentMinAngle: this.phase === "rest" ? null : this.minAngle,
      reps: this.reps,
      warnings: {
        asymmetry: this.phase !== "rest" && asym > this.def.asymmetryWarnDeg,
        trunkLean: lean > this.def.trunkLeanWarnDeg,
      },
    };
  }

  private finishRep(t: number): void {
    const duration = t - this.tStart;
    this.phase = "rest";
    if (duration < this.def.minRepDurationMs) return; // rebond du signal, pas une rep
    this.reps.push({
      index: this.reps.length + 1,
      tStart: this.tStart,
      tEnd: t,
      minAngle: this.minAngle,
      asymmetryAtBottom: this.asymAtMin,
      maxTrunkLean: this.maxLean,
      complete: this.minAngle <= this.def.thresholds.target,
    });
  }

  getReps(): Rep[] {
    return this.reps;
  }
}

/** Synthèse d'une séance, calculée à partir des reps. */
export interface SessionSummary {
  repsTotal: number;
  repsComplete: number;
  /** Meilleure profondeur (angle min) sur la séance. */
  bestMinAngle: number | null;
  meanAsymmetry: number | null;
  maxTrunkLean: number | null;
}

export function summarize(reps: Rep[]): SessionSummary {
  if (reps.length === 0) {
    return { repsTotal: 0, repsComplete: 0, bestMinAngle: null, meanAsymmetry: null, maxTrunkLean: null };
  }
  return {
    repsTotal: reps.length,
    repsComplete: reps.filter((r) => r.complete).length,
    bestMinAngle: Math.min(...reps.map((r) => r.minAngle)),
    meanAsymmetry: reps.reduce((s, r) => s + r.asymmetryAtBottom, 0) / reps.length,
    maxTrunkLean: Math.max(...reps.map((r) => r.maxTrunkLean)),
  };
}
