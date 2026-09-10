import type { JointAngles } from "../geometry/angles";
import { directionSign, type ExerciseDefinition } from "./exercise";

/** Résumé d'une répétition terminée. */
export interface Rep {
  index: number;
  tStart: number;
  tEnd: number;
  /**
   * Angle pilote extrême atteint, dans le sens du mouvement : le minimum pour une flexion
   * (squat), le maximum pour une extension (pont fessier). Nom historique conservé pour
   * rester compatible avec les séances déjà enregistrées.
   */
  minAngle: number;
  /** Écart |gauche − droite| de l'angle pilote au point extrême. */
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
  /** Amplitude atteinte sur la rep en cours (angle extrême). */
  currentMinAngle: number | null;
  reps: Rep[];
  warnings: { asymmetry: boolean; trunkLean: boolean };
}

/**
 * Machine à états déterministe : rest → down → up → rest.
 * Une rep est comptée quand l'angle pilote revient au repos après s'en être éloigné ;
 * elle est complète si l'amplitude cible a été franchie.
 *
 * Les exercices en extension (l'angle monte pendant l'effort) sont traités en changeant
 * le signe de l'angle pilote et des seuils : la machine à états ci-dessous ne connaît
 * qu'un seul cas, « l'angle descend puis remonte ».
 */
export class RepCounter {
  private readonly sign: 1 | -1;
  private phase: Phase = "rest";
  private tStart = 0;
  /** Extremum en espace transformé (toujours un minimum). */
  private minX = Infinity;
  private asymAtMin = 0;
  private maxLean = 0;
  private reps: Rep[] = [];

  constructor(private readonly def: ExerciseDefinition) {
    this.sign = directionSign(def);
  }

  update(t: number, a: JointAngles): LiveMetrics {
    const { left, right } = this.def.primaryAngle;
    const l = a[left], r = a[right];
    const s = this.sign;
    // Sur un mouvement unilatéral (fente), moyenner les deux côtés dilue le côté qui
    // travaille : on suit le plus engagé dans le sens du mouvement. Sur un mouvement
    // bilatéral, la moyenne reste plus robuste au bruit d'un côté mal vu.
    const primary = Number.isNaN(l)
      ? r
      : Number.isNaN(r)
        ? l
        : this.def.unilateral
          ? (s === 1 ? Math.min(l, r) : Math.max(l, r))
          : (l + r) / 2;
    const asym = Number.isNaN(l) || Number.isNaN(r) ? 0 : Math.abs(l - r);
    const lean = Number.isNaN(a.trunkLean) ? 0 : a.trunkLean;
    const rest = s * this.def.thresholds.rest;
    const target = s * this.def.thresholds.target;
    const x = s * primary;

    if (!Number.isNaN(primary)) {
      switch (this.phase) {
        case "rest":
          if (x < rest) {
            this.phase = "down";
            this.tStart = t;
            this.minX = x;
            this.asymAtMin = asym;
            this.maxLean = lean;
          }
          break;
        case "down":
          if (x < this.minX) {
            this.minX = x;
            this.asymAtMin = asym;
          }
          this.maxLean = Math.max(this.maxLean, lean);
          // On considère le retour entamé dès qu'on s'éloigne nettement du point extrême.
          if (x > this.minX + 10) this.phase = "up";
          break;
        case "up":
          this.maxLean = Math.max(this.maxLean, lean);
          if (x < this.minX) {
            // Nouvel effort sans être repassé par le repos : on reste sur la même rep.
            this.phase = "down";
            this.minX = x;
            this.asymAtMin = asym;
          } else if (x >= rest) {
            this.finishRep(t, target);
          }
          break;
      }
    }

    return {
      phase: this.phase,
      primaryAngle: primary,
      asymmetry: asym,
      trunkLean: lean,
      currentMinAngle: this.phase === "rest" ? null : s * this.minX,
      reps: this.reps,
      warnings: {
        // Un seuil absent veut dire « cette mesure n'a pas de sens pour cet exercice » :
        // on n'alerte pas, et l'UI n'affiche pas la tuile correspondante.
        asymmetry:
          this.def.asymmetryWarnDeg != null && this.phase !== "rest" && asym > this.def.asymmetryWarnDeg,
        trunkLean: this.def.trunkLeanWarnDeg != null && lean > this.def.trunkLeanWarnDeg,
      },
    };
  }

  private finishRep(t: number, target: number): void {
    const duration = t - this.tStart;
    this.phase = "rest";
    if (duration < this.def.minRepDurationMs) return; // rebond du signal, pas une rep
    this.reps.push({
      index: this.reps.length + 1,
      tStart: this.tStart,
      tEnd: t,
      minAngle: this.sign * this.minX,
      asymmetryAtBottom: this.asymAtMin,
      maxTrunkLean: this.maxLean,
      complete: this.minX <= target,
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
  /** Meilleure amplitude atteinte sur la séance (angle extrême le plus favorable). */
  bestMinAngle: number | null;
  meanAsymmetry: number | null;
  maxTrunkLean: number | null;
}

/**
 * `def` sert uniquement à savoir dans quel sens « meilleur » se lit. Sans lui, on
 * suppose une flexion (le cas du squat), ce qui garde le comportement historique.
 */
export function summarize(reps: Rep[], def?: ExerciseDefinition): SessionSummary {
  if (reps.length === 0) {
    return { repsTotal: 0, repsComplete: 0, bestMinAngle: null, meanAsymmetry: null, maxTrunkLean: null };
  }
  const extremes = reps.map((r) => r.minAngle);
  return {
    repsTotal: reps.length,
    repsComplete: reps.filter((r) => r.complete).length,
    bestMinAngle: def && def.direction === "extension" ? Math.max(...extremes) : Math.min(...extremes),
    meanAsymmetry: reps.reduce((s, r) => s + r.asymmetryAtBottom, 0) / reps.length,
    maxTrunkLean: Math.max(...reps.map((r) => r.maxTrunkLean)),
  };
}

/** Fusionne les résumés de plusieurs séries en un résumé d'exercice. */
export function mergeSummaries(parts: SessionSummary[], def?: ExerciseDefinition): SessionSummary {
  const kept = parts.filter((p) => p.repsTotal > 0);
  if (kept.length === 0) {
    return { repsTotal: 0, repsComplete: 0, bestMinAngle: null, meanAsymmetry: null, maxTrunkLean: null };
  }
  const bests = kept.map((p) => p.bestMinAngle).filter((v): v is number => v != null);
  const asyms = kept.filter((p) => p.meanAsymmetry != null);
  const leans = kept.map((p) => p.maxTrunkLean).filter((v): v is number => v != null);
  const total = kept.reduce((s, p) => s + p.repsTotal, 0);
  return {
    repsTotal: total,
    repsComplete: kept.reduce((s, p) => s + p.repsComplete, 0),
    bestMinAngle: bests.length === 0 ? null : def && def.direction === "extension" ? Math.max(...bests) : Math.min(...bests),
    meanAsymmetry: asyms.length === 0 ? null : asyms.reduce((s, p) => s + p.meanAsymmetry! * p.repsTotal, 0) / total,
    maxTrunkLean: leans.length === 0 ? null : Math.max(...leans),
  };
}
