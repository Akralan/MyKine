import { describe, expect, it } from "vitest";
import type { JointAngles } from "../geometry/angles";
import { GLUTE_BRIDGE, LUNGE, SQUAT } from "./exercise";
import { RepCounter, summarize } from "./repCounter";

function angles(knee: number, extra: Partial<JointAngles> = {}): JointAngles {
  return {
    kneeL: knee, kneeR: knee, hipL: knee, hipR: knee,
    shoulderL: 20, shoulderR: 20, ankleL: 95, ankleR: 95, trunkLean: 10,
    ...extra,
  };
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

describe("RepCounter (exercice en extension : pont fessier)", () => {
  /** Une rep de pont fessier : hanche 100° → sommet → 100°. */
  function bridgeRep(top: number, n = 60): number[] {
    const up = Array.from({ length: n }, (_, i) => 100 + ((top - 100) * i) / (n - 1));
    return [...up, ...up.slice().reverse()];
  }
  const play2 = (traj: number[]) => {
    const c = new RepCounter(GLUTE_BRIDGE);
    let last!: ReturnType<RepCounter["update"]>;
    traj.forEach((hip, i) => (last = c.update(i * 33, angles(160, { hipL: hip, hipR: hip }))));
    return last;
  };

  it("ne compte rien tant que le bassin reste au sol", () => {
    expect(play2(Array(40).fill(100)).reps).toHaveLength(0);
  });

  it("compte une rep complète quand l'extension dépasse la cible", () => {
    const m = play2(bridgeRep(175));
    expect(m.reps).toHaveLength(1);
    expect(m.reps[0]!.complete).toBe(true);
    expect(m.reps[0]!.minAngle).toBeCloseTo(175); // extremum dans le sens du mouvement
  });

  it("marque incomplète une extension qui n'atteint pas la cible", () => {
    const m = play2(bridgeRep(160)); // franchit le repos (145°) mais pas la cible (170°)
    expect(m.reps).toHaveLength(1);
    expect(m.reps[0]!.complete).toBe(false);
  });

  it("n'alerte pas sur le tronc, mesure sans objet allongé", () => {
    // Allongé, trunkLean vaut ~90° en permanence : le seuil est absent de la définition.
    const c = new RepCounter(GLUTE_BRIDGE);
    const m = c.update(0, angles(160, { hipL: 100, hipR: 100, trunkLean: 90 }));
    expect(GLUTE_BRIDGE.trunkLeanWarnDeg).toBeUndefined();
    expect(m.warnings.trunkLean).toBe(false);
  });

  it("retient la meilleure amplitude au sens du mouvement", () => {
    const m = play2([...bridgeRep(165), ...bridgeRep(175)]);
    expect(summarize(m.reps, GLUTE_BRIDGE).bestMinAngle).toBeCloseTo(175);
    // sans définition, « meilleur » se lit comme une flexion : on retombe sur le minimum
    expect(summarize(m.reps).bestMinAngle).toBeCloseTo(165);
  });
});

describe("RepCounter (exercice unilatéral : fente avant)", () => {
  /** Jambe arrière tendue à 170°, jambe avant qui descend jusqu'à `bottom` puis remonte. */
  function lungeRep(bottom: number, n = 20): number[] {
    const down = Array.from({ length: n }, (_, i) => 170 - ((170 - bottom) * i) / (n - 1));
    return [...down, ...down.slice().reverse()];
  }
  const playLunge = (traj: number[]) => {
    const c = new RepCounter(LUNGE);
    let last!: ReturnType<RepCounter["update"]>;
    traj.forEach((front, i) => (last = c.update(i * 33, angles(170, { kneeR: front }))));
    return last;
  };

  it("suit le côté qui travaille, pas la moyenne des deux genoux", () => {
    const m = playLunge(lungeRep(85));
    expect(m.reps).toHaveLength(1);
    // La moyenne des deux genoux vaudrait (170 + 85) / 2 = 127,5°, au-dessus de la
    // cible de 90° : la rep serait comptée incomplète à tort.
    expect(m.reps[0]!.minAngle).toBeCloseTo(85);
    expect(m.reps[0]!.complete).toBe(true);
  });

  it("n'alerte jamais sur l'asymétrie, qui est la nature de l'exercice", () => {
    const m = playLunge(lungeRep(85));
    expect(LUNGE.asymmetryWarnDeg).toBeUndefined();
    expect(m.warnings.asymmetry).toBe(false);
  });

  it("garde la moyenne pour un exercice bilatéral", () => {
    // Même trajectoire sur le squat : un seul genou descend, la moyenne reste haute.
    const c = new RepCounter(SQUAT);
    let last!: ReturnType<RepCounter["update"]>;
    lungeRep(85).forEach((front, i) => (last = c.update(i * 33, angles(170, { kneeR: front }))));
    expect(last.reps[0]!.minAngle).toBeCloseTo(127.5);
    expect(last.reps[0]!.complete).toBe(false);
  });
});
