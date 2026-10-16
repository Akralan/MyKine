import { describe, expect, it } from "vitest";
import { EXERCISES } from "../scoring/exercise";
import { demoPatients, type DemoPatient } from "./data";
import { adherence, alerts, amplitudeGain, currentWeek, daysSinceLast, exerciseSeries, expectedSessions } from "./stats";

// Un jeudi : la semaine en cours a déjà quelques jours derrière elle.
const TODAY = new Date(2026, 9, 15, 18, 0);
const byId = (id: string, list = demoPatients(TODAY)): DemoPatient => list.find((p) => p.id === id)!;

describe("patients de démo", () => {
  it("sont cinq, et identiques d'un chargement à l'autre", () => {
    const a = demoPatients(TODAY);
    const b = demoPatients(TODAY);
    expect(a).toHaveLength(5);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("n'ont aucune séance dans le futur ni avant le début du programme", () => {
    for (const p of demoPatients(TODAY)) {
      for (const s of p.sessions) {
        expect(new Date(s.at).getTime()).toBeLessThanOrEqual(TODAY.getTime() + 86_400_000);
        expect(s.at.slice(0, 10) >= p.program.startedOn).toBe(true);
      }
    }
  });

  it("ne prescrivent que des exercices de la bibliothèque", () => {
    for (const p of demoPatients(TODAY)) for (const pr of p.program.plan) expect(EXERCISES[pr.exerciseId]).toBeDefined();
  });

  it("placent chaque patient dans la semaine prévue", () => {
    expect(currentWeek(byId("claire-martin"), TODAY)).toBe(3);
    expect(currentWeek(byId("marc-lefevre"), TODAY)).toBe(5);
    expect(currentWeek(byId("lea-rousseau"), TODAY)).toBe(1);
  });
});

describe("indicateurs", () => {
  it("bornent l'observance entre 0 et 1", () => {
    for (const p of demoPatients(TODAY)) {
      const a = adherence(p, TODAY);
      expect(a).not.toBeNull();
      expect(a!).toBeGreaterThanOrEqual(0);
      expect(a!).toBeLessThanOrEqual(1);
    }
  });

  it("attendent des séances au prorata des jours écoulés", () => {
    const p = byId("lea-rousseau");
    // Lundi → jeudi = 4 jours, 4 séances/semaine : 4/7 × 4 ≈ 2.
    expect(expectedSessions(p, TODAY)).toBe(2);
  });

  it("signalent le patient inactif, et lui seul", () => {
    const flagged = demoPatients(TODAY).filter((p) => alerts(p, TODAY).some((a) => a.kind === "inactivity"));
    expect(flagged.map((p) => p.id)).toEqual(["jean-dubois"]);
    expect(daysSinceLast(byId("jean-dubois"), TODAY)).toBeGreaterThanOrEqual(5);
  });

  it("repèrent la compensation du tronc de Marc sur le squat", () => {
    const a = alerts(byId("marc-lefevre"), TODAY);
    expect(a.some((x) => x.kind === "trunk" && x.detail.startsWith("Squat"))).toBe(true);
  });

  it("ne lèvent aucune alerte sur Sofia", () => {
    expect(alerts(byId("sofia-benali"), TODAY)).toEqual([]);
  });

  it("comptent un gain d'amplitude positif quand le squat s'approfondit", () => {
    const p = byId("claire-martin");
    const series = exerciseSeries(p, "squat");
    expect(series.length).toBeGreaterThan(3);
    expect(amplitudeGain(EXERCISES.squat!, series)!).toBeGreaterThan(0);
  });

  it("ne mesurent pas l'asymétrie sur la fente, où elle n'a pas de sens", () => {
    for (const pt of exerciseSeries(byId("claire-martin"), "lunge")) expect(pt.asymFlagPct).toBeNull();
  });
});

describe("alertes par patient", () => {
  it("repèrent l'asymétrie de Léa sur le pont fessier", () => {
    const a = alerts(byId("lea-rousseau"), TODAY);
    expect(a.some((x) => x.kind === "asymmetry" && x.detail.startsWith("Pont fessier"))).toBe(true);
  });

  it("ne lèvent aucune alerte sur Claire, la patiente de l'espace patient", () => {
    expect(alerts(byId("claire-martin"), TODAY)).toEqual([]);
  });
});

describe("quel que soit le jour d'ouverture de la démo", () => {
  // Une semaine complète, à 9 h : tôt dans la journée, le cas le plus piégeux.
  const days = Array.from({ length: 7 }, (_, i) => new Date(2026, 9, 12 + i, 9, 0));

  it("aucune séance n'est datée après l'instant présent", () => {
    for (const d of days) for (const p of demoPatients(d)) for (const s of p.sessions) expect(new Date(s.at).getTime()).toBeLessThanOrEqual(d.getTime());
  });

  it("seul Jean est signalé inactif", () => {
    for (const d of days) {
      const flagged = demoPatients(d).filter((p) => alerts(p, d).some((a) => a.kind === "inactivity"));
      expect(flagged.map((p) => p.id)).toEqual(["jean-dubois"]);
    }
  });
});
