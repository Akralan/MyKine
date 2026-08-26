import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { Frame } from "../pose/types";
import type { Rep, SessionSummary } from "../scoring/repCounter";

/** Métadonnées d'une séance — ce que la galerie affiche sans charger les frames. */
export interface SessionMeta {
  id: string;
  exerciseId: string;
  createdAt: number;
  durationMs: number;
  frameCount: number;
  /** Format de la vidéo source (largeur / hauteur), pour un replay non déformé. Absent sur les anciennes séances. */
  aspectRatio?: number;
  reps: Rep[];
  summary: SessionSummary;
}

/** Séance complète : uniquement la série temporelle de points, jamais d'image. */
export interface SessionRecord extends SessionMeta {
  frames: Frame[];
}

interface MyCoachDB extends DBSchema {
  sessions: {
    key: string;
    value: SessionRecord;
    indexes: { byDate: number };
  };
}

let dbPromise: Promise<IDBPDatabase<MyCoachDB>> | null = null;

function db() {
  dbPromise ??= openDB<MyCoachDB>("mycoach", 1, {
    upgrade(d) {
      const store = d.createObjectStore("sessions", { keyPath: "id" });
      store.createIndex("byDate", "createdAt");
    },
  });
  return dbPromise;
}

export async function saveSession(record: SessionRecord): Promise<void> {
  await (await db()).put("sessions", record);
}

export async function loadSession(id: string): Promise<SessionRecord | undefined> {
  return (await db()).get("sessions", id);
}

export async function deleteSession(id: string): Promise<void> {
  await (await db()).delete("sessions", id);
}

/** Liste des séances, plus récentes en premier, sans les frames. */
export async function listSessions(): Promise<SessionMeta[]> {
  const all = await (await db()).getAllFromIndex("sessions", "byDate");
  return all.reverse().map(({ frames: _frames, ...meta }) => meta);
}
