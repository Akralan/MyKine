import { describe, expect, it } from "vitest";
import type { JointAngles } from "../geometry/angles";
import { SQUAT } from "./exercise";
import { RepCounter, summarize } from "./repCounter";

function angles(knee: number, extra: Partial<JointAngles> = {}): JointAngles {
  return { kneeL: knee, kneeR: knee, hipL: knee, hipR: knee, trunkLean: 10, ...extra };
}

/** Joue une trajectoire d'angle genou à 30 fps (une valeur par frame). */
function play(counter: RepCounter, trajectory: number[], t0 = 0, mutate?: (i: number, a: JointAngles) => JointAngles) {
  let last!: ReturnType<RepCounter["update"]>;
  trajectory.forEach((knee, i) => {
    const a = mutate ? mutate(i, angles(knee)) : angles(knee);
    last = counter.update(t0 + i * 33, a);
  });
  return last;
}

/** Une rep : 170 → bottom → 170, `n` frames par demi-mouvement. */
function rep(bottom: number, n = 20): number[] {
  const down = Array.from({ length: n }, (_, i) => 170 - ((170 - bottom) * i) / (n - 1));
  return [...down, ...down.slice().reverse()];
}

describe("RepCounter (squat)", () => {
  it("ne compte rien au repos", () => {
    const m = play(new RepCounter(SQUAT), Array(30).fill(170));
    expect(m.reps).toHaveLength(0);
    expect(m.phase).toBe("rest");
  });

  it("compte une rep complète et mesure sa profondeur", () => {
    const m = play(new RepCounter(SQUAT), rep(85));
    expect(m.reps).toHaveLength(1);
    expect(m.reps[0]!.complete).toBe(true);
    expect(m.reps[0]!.minAngle).toBeCloseTo(85);
  });

  it("compte trois reps consécutives", () => {
    const m = play(new RepCounter(SQUAT), [...rep(85), ...rep(90), ...rep(80)]);
    expect(m.reps.map((r) => r.index)).toEqual([1, 2, 3]);
  });

  it("marque une rep trop peu profonde comme incomplète", () => {
    const m = play(new RepCounter(SQUAT), rep(130));
    expect(m.reps).toHaveLength(1);
    expect(m.reps[0]!.complete).toBe(false);
  });

  it("ignore un rebond trop court pour être une rep", () => {
    const m = play(new RepCounter(SQUAT), [170, 150, 170, 170]);
    expect(m.reps).toHaveLength(0);
  });

  it("mesure l'asymétrie au point bas", () => {
    const m = play(new RepCounter(SQUAT), rep(85), 0, (_, a) => ({ ...a, kneeR: a.kneeL + 20 }));
    expect(m.reps[0]!.asymmetryAtBottom).toBeCloseTo(20);
  });

  it("remonte l'inclinaison max du tronc sur la rep", () => {
    const m = play(new RepCounter(SQUAT), rep(85), 0, (i, a) => ({ ...a, trunkLean: i === 20 ? 55 : 10 }));
    expect(m.reps[0]!.maxTrunkLean).toBe(55);
    expect(summarize(m.reps).maxTrunkLean).toBe(55);
  });

  it("garde une seule rep si le patient redescend sans repasser par le repos", () => {
    const ramp = (from: number, to: number, n: number) =>
      Array.from({ length: n }, (_, i) => from + ((to - from) * i) / (n - 1));
    // descend à 85, remonte seulement à 130, redescend à 80, puis remonte au repos
    const traj = [...ramp(170, 85, 20), ...ramp(85, 130, 10), ...ramp(130, 80, 12), ...ramp(80, 170, 20)];
    const m = play(new RepCounter(SQUAT), traj);
    expect(m.reps).toHaveLength(1);
    expect(m.reps[0]!.minAngle).toBeCloseTo(80);
  });

  it("supporte un côté manquant (NaN)", () => {
    const m = play(new RepCounter(SQUAT), rep(85), 0, (_, a) => ({ ...a, kneeR: NaN }));
    expect(m.reps).toHaveLength(1);
  });
});

describe("summarize", () => {
  it("gère une séance vide", () => {
    expect(summarize([]).repsTotal).toBe(0);
    expect(summarize([]).bestMinAngle).toBeNull();
  });
});
