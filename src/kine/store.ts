import type { Prescription } from "../program/types";
import { EXERCISES } from "../scoring/exercise";
import { DEMO_PATIENT_ID, KINE_PLANS_KEY } from "../program/demo";
import { listSessions } from "../storage/db";
import { demoPatients, type DemoPatient, type DemoSession } from "./data";

/**
 * Stockage de la démo kiné. Tout vit dans le `localStorage` de ce navigateur :
 * rien n'est envoyé nulle part, et « Supprimer mon compte » efface vraiment tout.
 *
 * On ne stocke jamais le mot de passe saisi à l'inscription.
 */

/** Version des documents légaux acceptés : un changement de version redemande l'accord. */
export const LEGAL_VERSION = "1.0";

export interface Consent {
  document: "cgu" | "confidentialite";
  version: string;
  acceptedAt: string;
}

export interface Account {
  firstName: string;
  lastName: string;
  email: string;
  profession: string;
  rpps: string;
  practice: string;
  newsletter: boolean;
  createdAt: string;
  consents: Consent[];
}

/** Patient ajouté pendant la démo : pas de séance, seulement une identité et un programme. */
export interface CreatedPatient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  condition: string;
  plan: Prescription[];
  sessionsPerWeek: number;
  weeks: number;
  createdAt: string;
  consentOn: string;
}

const KEYS = {
  account: "mycoach.kine.account",
  session: "mycoach.kine.session",
  created: "mycoach.kine.patients",
  /** Partagée avec l'app patient : c'est par elle que le programme de Claire y arrive. */
  plans: KINE_PLANS_KEY,
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* navigation privée : la démo fonctionne, mais ne se souvient de rien */
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* idem */
  }
}

/* --- Compte ------------------------------------------------------------------ */

export function getAccount(): Account | null {
  return read<Account>(KEYS.account);
}

export function saveAccount(a: Account): void {
  write(KEYS.account, a);
}

/** Session ouverte : distincte du compte, pour que « Se déconnecter » ait un sens. */
export function isSignedIn(): boolean {
  return getAccount() != null && read<boolean>(KEYS.session) === true;
}

export function signIn(): void {
  write(KEYS.session, true);
}

export function signOut(): void {
  remove(KEYS.session);
}

/** Droit à l'effacement : compte, consentements, patients ajoutés, programmes modifiés. */
export function deleteEverything(): void {
  Object.values(KEYS).forEach(remove);
}

/** Droit à la portabilité : tout ce que la démo sait du kiné, en JSON lisible. */
export function exportData(): string {
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: getAccount(),
      createdPatients: read<CreatedPatient[]>(KEYS.created) ?? [],
      modifiedPrograms: read<Record<string, Prescription[]>>(KEYS.plans) ?? {},
    },
    null,
    2,
  );
}

/** N° RPPS : 11 chiffres. La clé de contrôle n'est pas vérifiée en démo. */
export function isValidRpps(v: string): boolean {
  return /^\d{11}$/.test(v.replace(/\s/g, ""));
}

export function isValidEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

/* --- Patients ----------------------------------------------------------------- */

export function createdPatients(): CreatedPatient[] {
  return read<CreatedPatient[]>(KEYS.created) ?? [];
}

export function addPatient(p: CreatedPatient): void {
  write(KEYS.created, [...createdPatients(), p]);
}

/** Programme modifié par le kiné, par identifiant de patient. */
export function savePlan(patientId: string, plan: Prescription[]): void {
  const all = read<Record<string, Prescription[]>>(KEYS.plans) ?? {};
  all[patientId] = plan;
  write(KEYS.plans, all);
}

function iso(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

/**
 * Séances réellement faites dans l'app patient de démo, lues dans l'IndexedDB de ce
 * navigateur (même origine). Une entrée y vaut une série : on les regroupe par séance.
 */
export async function realSessions(): Promise<DemoSession[]> {
  let metas: Awaited<ReturnType<typeof listSessions>>;
  try {
    // Borné dans le temps : une base bloquée par un autre onglet ne doit pas figer l'espace kiné.
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error("IndexedDB trop lente")), 1500));
    metas = await Promise.race([listSessions(), timeout]);
  } catch {
    return []; // IndexedDB indisponible (navigation privée stricte) : la démo s'en passe
  }
  const byWorkout = new Map<string, DemoSession>();
  for (const m of [...metas].sort((a, b) => a.createdAt - b.createdAt)) {
    const key = m.workoutId ?? m.id;
    const s = byWorkout.get(key) ?? { at: new Date(m.createdAt).toISOString(), durationMin: 0, sets: [], real: true };
    s.durationMin += m.durationMs / 60_000;
    s.sets.push({
      exerciseId: m.exerciseId,
      reps: m.reps.map((r) => ({ extreme: Math.round(r.minAngle), complete: r.complete, trunk: r.maxTrunkLean, asym: r.asymmetryAtBottom })),
    });
    byWorkout.set(key, s);
  }
  return [...byWorkout.values()].map((s) => ({ ...s, durationMin: Math.max(1, Math.round(s.durationMin)) }));
}

/**
 * Les patients tels que les voit le kiné : les cinq fictifs, ses ajouts, ses modifications
 * de programme, et pour Claire les séances faites pour de vrai dans l'app patient.
 */
export function allPatients(today: Date = new Date(), real: DemoSession[] = []): DemoPatient[] {
  const plans = read<Record<string, Prescription[]>>(KEYS.plans) ?? {};
  const created: DemoPatient[] = createdPatients().map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    age: c.age,
    condition: c.condition,
    note: "Patient ajouté pendant la démo. Ses séances apparaîtront ici dès qu'il aura commencé.",
    program: {
      id: `prog-${c.id}`,
      label: c.condition.split(",")[0] ?? "Programme",
      zone: EXERCISES[c.plan[0]?.exerciseId ?? ""]?.zone ?? "genou",
      startedOn: c.createdAt.slice(0, 10),
      weeks: c.weeks,
      sessionsPerWeek: c.sessionsPerWeek,
      estimatedMinutes: 10,
      plan: c.plan,
    },
    sessions: [],
    consentOn: c.consentOn,
    createdInDemo: true,
  }));
  return [...demoPatients(today), ...created].map((p) => {
    const withPlan = plans[p.id] ? { ...p, program: { ...p.program, plan: plans[p.id]! } } : p;
    return p.id === DEMO_PATIENT_ID && real.length ? { ...withPlan, sessions: [...withPlan.sessions, ...real] } : withPlan;
  });
}

export function newPatientId(firstName: string, lastName: string): string {
  const slug = `${firstName}-${lastName}`
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${slug || "patient"}-${Date.now().toString(36)}`;
}

export const todayIso = (): string => iso(new Date());
