import { describe, expect, it } from "vitest";
import { GLUTE_BRIDGE, SQUAT } from "../scoring/exercise";
import type { Rep, SessionSummary } from "../scoring/repCounter";
import type { SessionMeta } from "../storage/db";
import { amplitudePct, computeProgress, computeTotals, groupBlocks, startOfWeek } from "./progress";
import type { Program } from "./types";

const PROGRAM: Program = {
  id: "p",
  label: "Genou",
  zone: "genou",
  startedOn: "2026-01-01",
  weeks: 6,
  sessionsPerWeek: 5,
  estimatedMinutes: 12,
  plan: [
    { exerciseId: "squat", sets: 3, reps: 12, targetDeg: 100 },
    { exerciseId: "glute-bridge", sets: 2, reps: 15 },
  ],
};

function rep(minAngle: number, complete: boolean): Rep {
  return { index: 1, tStart: 0, tEnd: 2000, minAngle, asymmetryAtBottom: 5, maxTrunkLean: 20, complete };
}

function summary(best: number, total: number): SessionSummary {
  return { repsTotal: total, repsComplete: total, bestMinAngle: best, meanAsymmetry: 5, maxTrunkLean: 20 };
}

function set(opts: Partial<SessionMeta> & { createdAt: number }): SessionMeta {
  return {
    id: crypto.randomUUID(),
    exerciseId: "squat",
    durationMs: 60000,
    frameCount: 100,
    reps: [rep(95, true)],
    summary: summary(95, 1),
    ...opts,
  };
}

/** Un instant du jour, à l'heure indiquée. */
function today(hour: number): number {
  const d = new Date();
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

function daysAgo(n: number, hour = 10): number {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

describe("amplitudePct", () => {
  it("vaut 1 quand la cible est franchie en flexion", () => {
    expect(amplitudePct(SQUAT, 100)).toBeCloseTo(1);
    expect(amplitudePct(SQUAT, 85)).toBeCloseTo(1); // au-delà de la cible : plafonné
  });
  it("vaut 0 au repos et croît avec la descente", () => {
    expect(amplitudePct(SQUAT, 160)).toBeCloseTo(0);
    expect(amplitudePct(SQUAT, 130)).toBeCloseTo(0.5);
  });
  it("se lit dans l'autre sens pour une extension", () => {
    expect(amplitudePct(GLUTE_BRIDGE, 145)).toBeCloseTo(0); // repos : bassin au sol
    expect(amplitudePct(GLUTE_BRIDGE, 157.5)).toBeCloseTo(0.5);
    expect(amplitudePct(GLUTE_BRIDGE, 170)).toBeCloseTo(1); // ligne épaule–hanche–genou
  });
  it("renvoie 0 sans mesure", () => {
    expect(amplitudePct(SQUAT, null)).toBe(0);
  });
});

describe("groupBlocks", () => {
  it("regroupe les séries d'un même exercice dans une même séance", () => {
    const blocks = groupBlocks([
      set({ createdAt: today(9), workoutId: "w1", setIndex: 1, summary: summary(98, 12) }),
      set({ createdAt: today(10), workoutId: "w1", setIndex: 2, summary: summary(94, 10) }),
    ]);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]!.sets).toHaveLength(2);
    expect(blocks[0]!.summary.repsTotal).toBe(22);
    expect(blocks[0]!.summary.bestMinAngle).toBe(94); // flexion : le plus petit angle
    expect(blocks[0]!.durationMs).toBe(120000);
  });

  it("sépare deux exercices d'une même séance", () => {
    const blocks = groupBlocks([
      set({ createdAt: today(9), workoutId: "w1" }),
      set({ createdAt: today(10), workoutId: "w1", exerciseId: "glute-bridge" }),
    ]);
    expect(blocks).toHaveLength(2);
    expect(new Set(blocks.map((b) => b.workoutId))).toEqual(new Set(["w1"]));
  });

  it("traite une séance antérieure au programme comme isolée", () => {
    const a = set({ createdAt: today(9) });
    const b = set({ createdAt: today(10) });
    const blocks = groupBlocks([a, b]);
    expect(blocks).toHaveLength(2);
    expect(blocks.map((x) => x.workoutId).sort()).toEqual([a.id, b.id].sort());
  });

  it("ouvre le replay sur la série la plus fournie", () => {
    const light = set({ createdAt: today(9), workoutId: "w1", summary: summary(98, 4) });
    const heavy = set({ createdAt: today(10), workoutId: "w1", summary: summary(96, 12) });
    expect(groupBlocks([light, heavy])[0]!.bestSetId).toBe(heavy.id);
  });

  it("classe les blocs du plus récent au plus ancien", () => {
    const blocks = groupBlocks([
      set({ createdAt: daysAgo(3), workoutId: "old" }),
      set({ createdAt: today(9), workoutId: "new" }),
    ]);
    expect(blocks.map((b) => b.workoutId)).toEqual(["new", "old"]);
  });
});

describe("computeProgress", () => {
  it("dérive la semaine du programme depuis sa date de début", () => {
    // Deux semaines pleines écoulées, quel que soit le jour où le test tourne.
    const started = startOfWeek(new Date());
    started.setDate(started.getDate() - 14);
    const iso = new Date(started.getTime() - started.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    expect(computeProgress({ ...PROGRAM, startedOn: iso }, []).week).toBe(3);
  });

  it("plafonne la semaine à la durée du programme", () => {
    const p = computeProgress({ ...PROGRAM, startedOn: "2020-01-01" }, []);
    expect(p.week).toBe(PROGRAM.weeks);
  });

  it("compte une séance par workoutId, pas par série", () => {
    const p = computeProgress(PROGRAM, [
      set({ createdAt: today(9), workoutId: "w1", setIndex: 1 }),
      set({ createdAt: today(9), workoutId: "w1", setIndex: 2 }),
      set({ createdAt: today(11), workoutId: "w2", setIndex: 1 }),
    ]);
    expect(p.sessionsThisWeek).toBe(2);
  });

  it("marque un exercice fait quand toutes ses séries du jour sont enregistrées", () => {
    const p = computeProgress(PROGRAM, [
      set({ createdAt: today(9), workoutId: "w1", setIndex: 1 }),
      set({ createdAt: today(9), workoutId: "w1", setIndex: 2 }),
      set({ createdAt: today(9), workoutId: "w1", setIndex: 3 }),
    ]);
    expect(p.today[0]!.setsDone).toBe(3);
    expect(p.today[0]!.done).toBe(true);
    expect(p.today[1]!.done).toBe(false);
  });

  it("ne compte pas les séries d'hier dans la séance du jour", () => {
    const p = computeProgress(PROGRAM, [set({ createdAt: daysAgo(1), workoutId: "w0" })]);
    expect(p.today[0]!.setsDone).toBe(0);
  });

  it("coche la bonne case dans la bande de la semaine", () => {
    const p = computeProgress(PROGRAM, [set({ createdAt: today(9), workoutId: "w1" })]);
    const index = p.days.findIndex((d) => d.today);
    expect(p.days.filter((d) => d.done)).toHaveLength(1);
    expect(p.days[index]!.done).toBe(true);
    expect(p.days).toHaveLength(7);
  });

  it("construit la tendance dans l'ordre chronologique et met en avant les deux dernières", () => {
    const days = [5, 4, 3, 2, 1];
    const p = computeProgress(
      PROGRAM,
      days.map((d, i) => set({ createdAt: daysAgo(d), workoutId: `w${i}`, summary: summary(120 - i * 5, 10) })),
    );
    expect(p.trend).toHaveLength(5);
    expect(p.trend.map((b) => b.pct)).toEqual([...p.trend.map((b) => b.pct)].sort((a, b) => a - b));
    expect(p.trend.filter((b) => b.recent)).toHaveLength(2);
    expect(p.best).toBe(100);
    expect(p.bestDelta).toBe(-20); // en flexion, progresser fait baisser l'angle
  });

  it("reste lisible sans aucune séance", () => {
    const p = computeProgress(PROGRAM, []);
    expect(p.trend).toEqual([]);
    expect(p.best).toBeNull();
    expect(p.bestDelta).toBeNull();
    expect(p.today.every((t) => !t.done)).toBe(true);
  });
});

describe("computeTotals", () => {
  it("compte les séances, les répétitions et le record de l'exercice principal", () => {
    const totals = computeTotals(PROGRAM, [
      set({ createdAt: today(9), workoutId: "w1", setIndex: 1, summary: summary(98, 12) }),
      set({ createdAt: today(10), workoutId: "w1", setIndex: 2, summary: summary(92, 10) }),
      set({ createdAt: daysAgo(2), workoutId: "w2", summary: summary(105, 8) }),
      set({ createdAt: daysAgo(2), workoutId: "w2", exerciseId: "glute-bridge", summary: summary(170, 15) }),
    ]);
    expect(totals.workouts).toBe(2);
    expect(totals.reps).toBe(45);
    expect(totals.record).toBe(92); // le pont fessier n'entre pas dans le record du squat
  });

  it("gère une base vide", () => {
    expect(computeTotals(PROGRAM, [])).toEqual({ workouts: 0, reps: 0, record: null });
  });
});

describe("startOfWeek", () => {
  it("renvoie toujours un lundi à minuit", () => {
    for (let i = 0; i < 7; i++) {
      const d = new Date(2026, 8, 7 + i); // 7 septembre 2026 est un lundi
      const w = startOfWeek(d);
      expect(w.getDay()).toBe(1);
      expect(w.getHours()).toBe(0);
      expect(w.getDate()).toBe(7);
    }
  });
});
