import { EXERCISES, type ExerciseDefinition } from "../scoring/exercise";
import type { Prescription } from "../program/types";
import { targetOf, type DemoPatient, type DemoSession } from "./data";

/**
 * Indicateurs du tableau de bord kiné, tous dérivés des séances. Rien n'est stocké :
 * changer une séance change l'observance, les courbes et les alertes.
 */

const DAY = 86_400_000;

function dayStart(d: Date): number {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}

function parseDay(isoDay: string): Date {
  const [y = 1970, m = 1, d = 1] = isoDay.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Semaine en cours du programme, de 1 à `weeks` (bornée). */
export function currentWeek(p: DemoPatient, today: Date): number {
  const days = Math.floor((dayStart(today) - parseDay(p.program.startedOn).getTime()) / DAY);
  return Math.max(1, Math.min(p.program.weeks, Math.floor(days / 7) + 1));
}

/**
 * Séances attendues depuis le début du programme, jusqu'à aujourd'hui inclus.
 * Approximation assumée : `sessionsPerWeek` réparties sur 7 jours, au prorata des jours écoulés.
 */
export function expectedSessions(p: DemoPatient, today: Date): number {
  const days = Math.floor((dayStart(today) - parseDay(p.program.startedOn).getTime()) / DAY) + 1;
  if (days <= 0) return 0;
  const capped = Math.min(days, p.program.weeks * 7);
  return Math.max(1, Math.round((capped / 7) * p.program.sessionsPerWeek));
}

/** Part des séances attendues réellement faites, de 0 à 1. `null` si rien n'était attendu. */
export function adherence(p: DemoPatient, today: Date): number | null {
  const expected = expectedSessions(p, today);
  if (expected === 0) return null;
  return Math.min(1, p.sessions.length / expected);
}

export function lastSession(p: DemoPatient): DemoSession | undefined {
  return p.sessions.reduce<DemoSession | undefined>((a, s) => (!a || s.at > a.at ? s : a), undefined);
}

/** Jours entiers depuis la dernière séance ; `null` si aucune séance. */
export function daysSinceLast(p: DemoPatient, today: Date): number | null {
  const last = lastSession(p);
  if (!last) return null;
  return Math.floor((dayStart(today) - dayStart(new Date(last.at))) / DAY);
}

/** Séances faites cette semaine (lundi → aujourd'hui). */
export function sessionsThisWeek(p: DemoPatient, today: Date): number {
  const m = new Date(today);
  m.setHours(0, 0, 0, 0);
  m.setDate(m.getDate() - ((m.getDay() + 6) % 7));
  return p.sessions.filter((s) => new Date(s.at).getTime() >= m.getTime()).length;
}

/** Une séance vue sous l'angle d'un exercice : meilleure amplitude, reps complètes, compensations. */
export interface ExercisePoint {
  at: string;
  /** Angle extrême le plus favorable de la séance (le plus bas en flexion, le plus haut en extension). */
  best: number;
  completeReps: number;
  totalReps: number;
  /** Part des reps où le tronc ou l'asymétrie dépassent le seuil de l'exercice. */
  trunkFlagPct: number | null;
  asymFlagPct: number | null;
}

function better(def: ExerciseDefinition, a: number, b: number): number {
  return def.direction === "flexion" ? Math.min(a, b) : Math.max(a, b);
}

export function exerciseSeries(p: DemoPatient, exerciseId: string): ExercisePoint[] {
  const def = EXERCISES[exerciseId];
  if (!def) return [];
  const points: ExercisePoint[] = [];
  for (const s of [...p.sessions].sort((a, b) => a.at.localeCompare(b.at))) {
    const reps = s.sets.filter((x) => x.exerciseId === exerciseId).flatMap((x) => x.reps);
    if (reps.length === 0) continue;
    const pct = (flagged: number, measured: number) => (measured === 0 ? null : flagged / measured);
    const trunkMeasured = reps.filter((r) => r.trunk != null);
    const asymMeasured = reps.filter((r) => r.asym != null);
    points.push({
      at: s.at,
      best: reps.reduce((a, r) => better(def, a, r.extreme), reps[0]!.extreme),
      completeReps: reps.filter((r) => r.complete).length,
      totalReps: reps.length,
      trunkFlagPct:
        def.trunkLeanWarnDeg == null
          ? null
          : pct(trunkMeasured.filter((r) => r.trunk! > def.trunkLeanWarnDeg!).length, trunkMeasured.length),
      asymFlagPct:
        def.asymmetryWarnDeg == null
          ? null
          : pct(asymMeasured.filter((r) => r.asym! > def.asymmetryWarnDeg!).length, asymMeasured.length),
    });
  }
  return points;
}

/** Écart d'amplitude entre la première et la dernière séance, signé « positif = progrès ». */
export function amplitudeGain(def: ExerciseDefinition, series: ExercisePoint[]): number | null {
  const first = series[0];
  const last = series[series.length - 1];
  if (series.length < 2 || !first || !last) return null;
  const delta = last.best - first.best;
  return def.direction === "flexion" ? -delta : delta;
}

export type AlertKind = "inactivity" | "adherence" | "trunk" | "asymmetry";

export interface Alert {
  kind: AlertKind;
  label: string;
  detail: string;
}

/** Seuils des alertes du tableau de bord. Des ordres de grandeur de démo, pas des valeurs cliniques. */
export const ALERT_RULES = {
  inactivityDays: 5,
  adherenceMin: 0.6,
  /** Part de reps au-delà du seuil, sur les trois dernières séances, qui déclenche l'alerte. */
  flagShare: 0.3,
  recentSessions: 3,
};

export function alerts(p: DemoPatient, today: Date): Alert[] {
  const out: Alert[] = [];
  // Sans séance, on compte depuis le début du programme : un programme démarré hier
  // n'est pas un patient inactif.
  const since = daysSinceLast(p, today);
  const idle = since ?? Math.floor((dayStart(today) - parseDay(p.program.startedOn).getTime()) / DAY);
  if (idle >= ALERT_RULES.inactivityDays) {
    out.push({
      kind: "inactivity",
      label: "Inactif",
      detail: since == null ? `Aucune séance depuis le début du programme.` : `Aucune séance depuis ${since} jours.`,
    });
  }
  const adh = adherence(p, today);
  if (adh != null && adh < ALERT_RULES.adherenceMin && p.sessions.length > 0) {
    out.push({ kind: "adherence", label: "Observance faible", detail: `${Math.round(adh * 100)} % des séances prévues.` });
  }
  for (const pr of p.program.plan) {
    const def = EXERCISES[pr.exerciseId];
    if (!def) continue;
    const recent = exerciseSeries(p, pr.exerciseId).slice(-ALERT_RULES.recentSessions);
    if (recent.length === 0) continue;
    const mean = (xs: (number | null)[]) => {
      const v = xs.filter((x): x is number => x != null);
      return v.length === 0 ? null : v.reduce((a, b) => a + b, 0) / v.length;
    };
    const trunk = mean(recent.map((x) => x.trunkFlagPct));
    if (trunk != null && trunk >= ALERT_RULES.flagShare) {
      out.push({
        kind: "trunk",
        label: "Compensation du tronc",
        detail: `${def.name} : tronc au-delà de ${def.trunkLeanWarnDeg}° sur ${Math.round(trunk * 100)} % des répétitions récentes.`,
      });
    }
    const asym = mean(recent.map((x) => x.asymFlagPct));
    if (asym != null && asym >= ALERT_RULES.flagShare) {
      out.push({
        kind: "asymmetry",
        label: "Asymétrie",
        detail: `${def.name} : écart gauche/droite au-delà de ${def.asymmetryWarnDeg}° sur ${Math.round(asym * 100)} % des répétitions récentes.`,
      });
    }
  }
  return out;
}

/** Ligne de prescription enrichie de sa définition et de la dernière mesure. */
export interface PlanRow {
  prescription: Prescription;
  def: ExerciseDefinition;
  target: number;
  last: ExercisePoint | undefined;
  gain: number | null;
}

export function planRows(p: DemoPatient): PlanRow[] {
  return p.program.plan
    .map((pr) => {
      const def = EXERCISES[pr.exerciseId];
      if (!def) return undefined;
      const series = exerciseSeries(p, pr.exerciseId);
      return { prescription: pr, def, target: targetOf(pr, def), last: series[series.length - 1], gain: amplitudeGain(def, series) };
    })
    .filter((x): x is PlanRow => x != null);
}
