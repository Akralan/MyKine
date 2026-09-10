import type { Program } from "./types";

/**
 * Programme de démonstration, codé en dur — dette assumée (ADR 0007).
 * C'est le seul endroit du code qui décide d'une dose ou d'une durée de programme ;
 * l'interface kiné le remplacera par une lecture distante, sans toucher à l'UI.
 */

const START_KEY = "mycoach.programStart";
/** La maquette montre « Semaine 3 » : on ouvre la démo au même point du parcours. */
const DEMO_OFFSET_WEEKS = 2;

/**
 * Date de début du programme. Ancrée au premier lancement, reculée de deux semaines
 * pleines pour que la démo s'ouvre en semaine 3 comme la maquette quel que soit le
 * jour d'installation, puis avance réellement avec le temps au lieu de rester figée
 * sur une date écrite en dur.
 */
function programStartedOn(): string {
  const iso = (d: Date) => {
    const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  const fallback = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - DEMO_OFFSET_WEEKS * 7); // lundi, deux semaines plus tôt
    return iso(d);
  };
  try {
    const stored = localStorage.getItem(START_KEY);
    if (stored && /^\d{4}-\d{2}-\d{2}$/.test(stored)) return stored;
    const first = fallback();
    localStorage.setItem(START_KEY, first);
    return first;
  } catch {
    return fallback(); // navigation privée : le programme redémarre à chaque session
  }
}

/** Le patient de la démo. Viendra du compte quand il y en aura un. */
export const DEMO_PATIENT = { firstName: "Claire" };

export const DEMO_PROGRAM: Program = {
  id: "demo-genou",
  label: "Genou",
  zone: "genou",
  startedOn: programStartedOn(),
  weeks: 6,
  sessionsPerWeek: 5,
  estimatedMinutes: 12,
  plan: [
    { exerciseId: "squat", sets: 3, reps: 12, targetDeg: 100 },
    { exerciseId: "lunge", sets: 3, reps: 10 },
    { exerciseId: "glute-bridge", sets: 2, reps: 15, holdMs: 3000 },
  ],
};

/** Remet le programme à son premier jour (écran Profil). */
export function resetProgramStart(): void {
  try {
    localStorage.removeItem(START_KEY);
  } catch {
    /* stockage indisponible */
  }
}
