import { EXERCISES, type ExerciseDefinition } from "../scoring/exercise";
import { mergeSummaries, type SessionSummary } from "../scoring/repCounter";
import type { SessionMeta } from "../storage/db";
import type { Dose, Prescription, Program } from "./types";

/**
 * Tout ce qui est affiché comme avancement est dérivé des séances réellement
 * enregistrées : rien n'est codé en dur ici. Seul le programme (doses, durée) l'est.
 */

/** Un exercice réalisé dans une séance : ses séries agrégées. */
export interface ExerciseBlock {
  key: string;
  workoutId: string;
  exerciseId: string;
  def: ExerciseDefinition | undefined;
  /** Début de la première série. */
  createdAt: number;
  /** Somme des durées des séries. */
  durationMs: number;
  sets: SessionMeta[];
  summary: SessionSummary;
  /** Série la plus fournie : celle que le bouton « Replay » ouvre. */
  bestSetId: string;
}

/** Identifiant de séance d'une série ; les séances antérieures au programme sont isolées. */
function workoutIdOf(s: SessionMeta): string {
  return s.workoutId ?? s.id;
}

/** Regroupe les séries par (séance, exercice), plus récent en premier. */
export function groupBlocks(metas: SessionMeta[]): ExerciseBlock[] {
  const byKey = new Map<string, SessionMeta[]>();
  for (const s of metas) {
    const key = `${workoutIdOf(s)}::${s.exerciseId}`;
    const list = byKey.get(key);
    if (list) list.push(s);
    else byKey.set(key, [s]);
  }
  const blocks: ExerciseBlock[] = [];
  for (const [key, sets] of byKey) {
    sets.sort((a, b) => a.createdAt - b.createdAt);
    const def = EXERCISES[sets[0]!.exerciseId];
    const best = sets.reduce((a, b) => (b.summary.repsTotal > a.summary.repsTotal ? b : a));
    blocks.push({
      key,
      workoutId: workoutIdOf(sets[0]!),
      exerciseId: sets[0]!.exerciseId,
      def,
      createdAt: sets[0]!.createdAt,
      durationMs: sets.reduce((s, x) => s + x.durationMs, 0),
      sets,
      summary: mergeSummaries(sets.map((x) => x.summary), def),
      bestSetId: best.id,
    });
  }
  return blocks.sort((a, b) => b.createdAt - a.createdAt);
}

/** Lundi 00:00 de la semaine contenant `d`. */
export function startOfWeek(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Décalage en jours calendaires — insensible aux changements d'heure, contrairement à +86400000 ms. */
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/**
 * Part d'amplitude cible atteinte, entre 0 et 1, quel que soit le sens du mouvement.
 * 1 = la cible est franchie. C'est ce que tracent les barres de progression.
 */
export function amplitudePct(def: ExerciseDefinition, extremeAngle: number | null): number {
  if (extremeAngle == null || Number.isNaN(extremeAngle)) return 0;
  const { rest, target } = def.thresholds;
  const span = target - rest; // négatif en flexion, positif en extension
  if (span === 0) return 0;
  return Math.max(0, Math.min(1, (extremeAngle - rest) / span));
}

/** Avancement d'un exercice du jour. */
export interface TodayItem {
  prescription: Prescription;
  def: ExerciseDefinition | undefined;
  dose: Dose;
  setsDone: number;
  repsDone: number;
  done: boolean;
}

export interface TrendBar {
  /** Hauteur relative de la barre, 0 à 1 (part d'amplitude cible atteinte). */
  pct: number;
  /** Les dernières séances sont mises en avant, comme dans la maquette. */
  recent: boolean;
}

/** Une case de la bande « Cette semaine ». */
export interface WeekDay {
  label: string;
  done: boolean;
  today: boolean;
}

export interface ProgramProgress {
  week: number;
  weeks: number;
  sessionsThisWeek: number;
  sessionsPerWeek: number;
  days: WeekDay[];
  today: TodayItem[];
  /** Exercice principal du programme : celui que suit la carte « Progression amplitude ». */
  mainDef: ExerciseDefinition | undefined;
  best: number | null;
  bestDelta: number | null;
  targetDeg: number | null;
  trend: TrendBar[];
}

export function doseOf(p: Prescription): Dose {
  return { sets: p.sets, reps: p.reps, holdMs: p.holdMs, targetDeg: p.targetDeg };
}

export function computeProgress(program: Program, metas: SessionMeta[]): ProgramProgress {
  const blocks = groupBlocks(metas);
  const now = new Date();
  const weekStart = startOfWeek(now).getTime();
  const dayStart = startOfDay(now).getTime();

  const started = new Date(`${program.startedOn}T00:00:00`);
  // Arrondi plutôt que troncature : un changement d'heure décale la différence d'une heure.
  const elapsedWeeks = Math.round((startOfWeek(now).getTime() - startOfWeek(started).getTime()) / 604800000);
  const week = Math.min(program.weeks, Math.max(1, elapsedWeeks + 1));

  const thisWeek = blocks.filter((b) => b.createdAt >= weekStart);
  const sessionsThisWeek = new Set(thisWeek.map((b) => b.workoutId)).size;

  const monday = startOfWeek(now);
  const days: WeekDay[] = ["L", "M", "M", "J", "V", "S", "D"].map((label, i) => {
    const from = addDays(monday, i).getTime();
    const to = addDays(monday, i + 1).getTime();
    return {
      label,
      done: thisWeek.some((b) => b.createdAt >= from && b.createdAt < to),
      today: from === dayStart,
    };
  });

  const todayBlocks = blocks.filter((b) => b.createdAt >= dayStart);
  const today: TodayItem[] = program.plan.map((p) => {
    const mine = todayBlocks.filter((b) => b.exerciseId === p.exerciseId);
    const setsDone = mine.reduce((s, b) => s + b.sets.length, 0);
    return {
      prescription: p,
      def: EXERCISES[p.exerciseId],
      dose: doseOf(p),
      setsDone,
      repsDone: mine.reduce((s, b) => s + b.summary.repsTotal, 0),
      done: setsDone >= p.sets,
    };
  });

  const mainId = program.plan[0]?.exerciseId;
  const mainDef = mainId ? EXERCISES[mainId] : undefined;
  const mainBlocks = blocks.filter((b) => b.exerciseId === mainId && b.summary.bestMinAngle != null).reverse();
  const last10 = mainBlocks.slice(-10);
  const trend: TrendBar[] = mainDef
    ? last10.map((b, i) => ({
        pct: amplitudePct(mainDef, b.summary.bestMinAngle),
        recent: i >= last10.length - 2,
      }))
    : [];

  const bests = mainBlocks.map((b) => b.summary.bestMinAngle!);
  const best = bests.length ? bests[bests.length - 1]! : null;
  const bestDelta = bests.length > 1 ? best! - bests[0]! : null;

  return {
    week,
    weeks: program.weeks,
    sessionsThisWeek,
    sessionsPerWeek: program.sessionsPerWeek,
    days,
    today,
    mainDef,
    best,
    bestDelta,
    targetDeg: program.plan[0]?.targetDeg ?? mainDef?.thresholds.target ?? null,
    trend,
  };
}

export interface Totals {
  workouts: number;
  reps: number;
  /** Meilleure amplitude tous exercices confondus, sur l'exercice principal. */
  record: number | null;
}

export function computeTotals(program: Program, metas: SessionMeta[]): Totals {
  const blocks = groupBlocks(metas);
  const mainId = program.plan[0]?.exerciseId;
  const mainDef = mainId ? EXERCISES[mainId] : undefined;
  const bests = blocks
    .filter((b) => b.exerciseId === mainId)
    .map((b) => b.summary.bestMinAngle)
    .filter((v): v is number => v != null);
  return {
    workouts: new Set(blocks.map((b) => b.workoutId)).size,
    reps: blocks.reduce((s, b) => s + b.summary.repsTotal, 0),
    record: bests.length === 0 ? null : mainDef?.direction === "extension" ? Math.max(...bests) : Math.min(...bests),
  };
}
