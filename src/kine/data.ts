import { EXERCISES, type ExerciseDefinition } from "../scoring/exercise";
import { DEMO_PATIENT_ID, DEMO_PLAN } from "../program/demo";
import type { Prescription, Program } from "../program/types";

/**
 * Patients fictifs de la démo kiné. Tout est généré de façon déterministe à partir
 * d'une graine et de la date du jour : la démo a toujours l'air « vivante » (dernière
 * séance hier, semaine en cours), sans rien stocker ni rien envoyer.
 *
 * Les noms, âges et pathologies sont inventés. Les mesures suivent les seuils réels
 * de la bibliothèque (`src/scoring/exercise.ts`), pour que ce que voit le kiné ici
 * soit cohérent avec ce que l'app patient mesurerait.
 */

export interface DemoRep {
  /** Angle pilote extrême de la rep (convention d'angle intérieur, cf. exercise.ts). */
  extreme: number;
  complete: boolean;
  /** Inclinaison maximale du tronc sur la rep, si l'exercice la mesure. */
  trunk?: number;
  /** Écart gauche/droite au point extrême, si l'exercice la mesure. */
  asym?: number;
}

export interface DemoSet {
  exerciseId: string;
  reps: DemoRep[];
}

export interface DemoSession {
  /** Horodatage ISO de début de séance. */
  at: string;
  /** Séance réellement faite dans l'app patient de démo, sur ce navigateur (pas générée). */
  real?: boolean;
  durationMin: number;
  sets: DemoSet[];
}

export interface DemoPatient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  condition: string;
  /** Contexte clinique court, affiché sur la fiche. */
  note: string;
  program: Program;
  sessions: DemoSession[];
  /** Date à laquelle le patient a donné son consentement au suivi (ISO). */
  consentOn: string;
  /** Ce patient est celui de l'espace patient de démo (Claire). */
  linkedToPatientDemo?: boolean;
  /** Patient ajouté par le kiné pendant la démo (stocké en local). */
  createdInDemo?: boolean;
}

/** Profil de comportement qui pilote la génération des séances d'un patient. */
interface Profile {
  /** Probabilité de faire chaque séance prévue. */
  adherence: number;
  /** Nombre de jours sans séance à la fin (inactivité récente). */
  idleDays: number;
  /** Part du chemin repos → cible déjà faite au début du programme, et à la date du jour. */
  startPct: number;
  nowPct: number;
  /**
   * Inclinaison du tronc et asymétrie typiques, en fraction du seuil d'alerte de chaque
   * exercice (1 = pile au seuil) : les seuils vont de 20° à 45° selon l'exercice.
   */
  trunk: number;
  asym: number;
  seed: number;
}

interface Spec {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  condition: string;
  note: string;
  label: string;
  zone: Program["zone"];
  weeks: number;
  sessionsPerWeek: number;
  estimatedMinutes: number;
  /** Semaine en cours du programme (1 = première). */
  currentWeek: number;
  plan: Prescription[];
  profile: Profile;
  linkedToPatientDemo?: boolean;
}

const SPECS: Spec[] = [
  {
    id: DEMO_PATIENT_ID,
    firstName: "Claire",
    lastName: "Martin",
    age: 34,
    condition: "Ligamentoplastie LCA, genou droit",
    note: "Reprise du renforcement à J+10 semaines. Objectif : retour à la course à 4 mois.",
    label: "Genou",
    zone: "genou",
    weeks: 6,
    sessionsPerWeek: 5,
    estimatedMinutes: 12,
    currentWeek: 3,
    plan: DEMO_PLAN,
    profile: { adherence: 0.9, idleDays: 1, startPct: 0.62, nowPct: 1.01, trunk: 0.55, asym: 0.5, seed: 11 },
    linkedToPatientDemo: true,
  },
  {
    id: "marc-lefevre",
    firstName: "Marc",
    lastName: "Lefèvre",
    age: 61,
    condition: "Prothèse totale de genou, genou gauche",
    note: "PTG à 3 mois. Flexion encore limitée, tendance à compenser par le tronc.",
    label: "Genou",
    zone: "genou",
    weeks: 8,
    sessionsPerWeek: 4,
    estimatedMinutes: 15,
    currentWeek: 5,
    plan: [
      { exerciseId: "squat", sets: 3, reps: 10, targetDeg: 110 },
      { exerciseId: "glute-bridge", sets: 3, reps: 12, holdMs: 2000 },
      { exerciseId: "calf-raise", sets: 2, reps: 15 },
    ],
    profile: { adherence: 0.72, idleDays: 2, startPct: 0.6, nowPct: 1.0, trunk: 1.06, asym: 0.65, seed: 23 },
  },
  {
    id: "sofia-benali",
    firstName: "Sofia",
    lastName: "Benali",
    age: 27,
    condition: "Entorse latérale de cheville, cheville droite",
    note: "Entorse grade II, reprise du handball visée dans 6 semaines.",
    label: "Cheville",
    zone: "cheville",
    weeks: 4,
    sessionsPerWeek: 5,
    estimatedMinutes: 10,
    currentWeek: 2,
    plan: [
      { exerciseId: "calf-raise", sets: 3, reps: 15 },
      { exerciseId: "squat", sets: 3, reps: 12 },
      { exerciseId: "lunge", sets: 2, reps: 10 },
    ],
    profile: { adherence: 0.97, idleDays: 0, startPct: 0.72, nowPct: 1.0, trunk: 0.45, asym: 0.4, seed: 37 },
  },
  {
    id: "jean-dubois",
    firstName: "Jean",
    lastName: "Dubois",
    age: 68,
    condition: "Tendinopathie de la coiffe des rotateurs, épaule gauche",
    note: "Douleur nocturne en régression. Élévation limitée à 80° sur prescription.",
    label: "Épaule",
    zone: "épaule",
    weeks: 6,
    sessionsPerWeek: 3,
    estimatedMinutes: 8,
    currentWeek: 4,
    plan: [{ exerciseId: "shoulder-raise", sets: 3, reps: 10, targetDeg: 80 }],
    profile: { adherence: 0.7, idleDays: 7, startPct: 0.6, nowPct: 0.9, trunk: 0.5, asym: 0.75, seed: 41 },
  },
  {
    id: "lea-rousseau",
    firstName: "Léa",
    lastName: "Rousseau",
    age: 45,
    condition: "Lombalgie commune",
    note: "Programme de renforcement de la chaîne postérieure, démarré cette semaine.",
    label: "Dos",
    zone: "dos",
    weeks: 6,
    sessionsPerWeek: 4,
    estimatedMinutes: 10,
    currentWeek: 1,
    plan: [
      { exerciseId: "glute-bridge", sets: 3, reps: 12, holdMs: 3000 },
      { exerciseId: "squat", sets: 2, reps: 10 },
    ],
    profile: { adherence: 1, idleDays: 0, startPct: 0.78, nowPct: 0.94, trunk: 0.5, asym: 1.2, seed: 53 },
  },
];

/** PRNG déterministe (mulberry32) : même graine, mêmes données, à chaque chargement. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DAY = 86_400_000;

function iso(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/** Lundi 0 h de la semaine de `d`. */
function monday(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}

/** Cible effective d'une prescription : celle du kiné si elle existe, sinon celle de l'exercice. */
export function targetOf(p: Prescription, def: ExerciseDefinition): number {
  return p.targetDeg ?? def.thresholds.target;
}

/** Jours de séance prévus dans une semaine, répartis régulièrement (0 = lundi). */
export function plannedDays(perWeek: number): number[] {
  const presets: Record<number, number[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return presets[Math.max(1, Math.min(7, perWeek))] ?? [0];
}

function generateSessions(spec: Spec, start: Date, today: Date): DemoSession[] {
  const r = rng(spec.profile.seed);
  const p = spec.profile;
  const sessions: DemoSession[] = [];
  const lastAllowed = today.getTime() - p.idleDays * DAY;
  const totalSpan = Math.max(DAY, today.getTime() - start.getTime());

  // Jours prévus déjà passés. Aujourd'hui ne compte que s'il est assez tard pour qu'une
  // séance ait pu avoir lieu.
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);
  const candidates: Date[] = [];
  for (let w = 0; w < spec.currentWeek; w++) {
    for (const d of plannedDays(spec.sessionsPerWeek)) {
      const day = new Date(start.getTime() + (w * 7 + d) * DAY);
      if (day.getTime() > lastAllowed) continue;
      if (day.getTime() === todayStart.getTime() && today.getHours() < 8) continue;
      candidates.push(day);
    }
  }

  candidates.forEach((day, i) => {
    // Un patient régulier a toujours fait sa dernière séance prévue : sans ça, deux
    // séances sautées d'affilée le feraient passer pour inactif selon le jour d'ouverture.
    const forced = i === candidates.length - 1 && p.idleDays < 5;
    if (r() > p.adherence && !forced) return;
    {
      const progress = (day.getTime() - start.getTime()) / totalSpan; // 0 au début, 1 aujourd'hui
      const pct = p.startPct + (p.nowPct - p.startPct) * progress;
      const at = new Date(day);
      at.setHours(7 + Math.floor(r() * 12), Math.floor(r() * 60));
      // Séance du jour : on la place avant l'instant présent.
      if (at.getTime() > today.getTime()) at.setTime(today.getTime() - (30 + Math.floor(r() * 60)) * 60_000);

      const sets: DemoSet[] = [];
      for (const pr of spec.plan) {
        const def = EXERCISES[pr.exerciseId];
        if (!def) continue;
        const { rest } = def.thresholds;
        const target = targetOf(pr, def);
        for (let s = 0; s < pr.sets; s++) {
          // La fatigue fait perdre un peu d'amplitude sur les dernières séries.
          const fatigue = s * 0.03;
          const reps: DemoRep[] = [];
          for (let k = 0; k < pr.reps; k++) {
            const local = Math.max(0, pct - fatigue + (r() - 0.5) * 0.14);
            const extreme = Math.round(rest + (target - rest) * local);
            const complete = def.direction === "flexion" ? extreme <= target : extreme >= target;
            reps.push({
              extreme,
              complete,
              trunk:
                def.trunkLeanWarnDeg == null
                  ? undefined
                  : Math.round(def.trunkLeanWarnDeg * (p.trunk + (r() - 0.5) * 0.2 + s * 0.04)),
              asym:
                def.asymmetryWarnDeg == null
                  ? undefined
                  : Math.round(Math.max(0, def.asymmetryWarnDeg * (p.asym + (r() - 0.5) * 0.4))),
            });
          }
          sets.push({ exerciseId: pr.exerciseId, reps });
        }
      }
      sessions.push({ at: at.toISOString(), durationMin: spec.estimatedMinutes + Math.round((r() - 0.3) * 4), sets });
    }
  });
  return sessions;
}

/** Les cinq patients de la démo, datés par rapport à `today`. */
export function demoPatients(today: Date = new Date()): DemoPatient[] {
  return SPECS.map((spec) => {
    // Le programme a commencé le lundi d'il y a (semaine en cours − 1) semaines.
    const start = new Date(monday(today).getTime() - (spec.currentWeek - 1) * 7 * DAY);
    const consent = new Date(start.getTime() - 2 * DAY);
    return {
      id: spec.id,
      firstName: spec.firstName,
      lastName: spec.lastName,
      age: spec.age,
      condition: spec.condition,
      note: spec.note,
      program: {
        id: `prog-${spec.id}`,
        label: spec.label,
        zone: spec.zone,
        startedOn: iso(start),
        weeks: spec.weeks,
        sessionsPerWeek: spec.sessionsPerWeek,
        estimatedMinutes: spec.estimatedMinutes,
        plan: spec.plan,
      },
      sessions: generateSessions(spec, start, today),
      consentOn: iso(consent),
      linkedToPatientDemo: spec.linkedToPatientDemo,
    };
  });
}
