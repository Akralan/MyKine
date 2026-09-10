import { describe, expect, it } from "vitest";
import { AngleSmoother, jointAngle, leanFromVertical } from "./angles";

describe("jointAngle", () => {
  it("renvoie 180° pour trois points alignés", () => {
    expect(jointAngle({ x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 }, { x: 0, y: 2, z: 0 })).toBeCloseTo(180);
  });
  it("renvoie 90° pour un angle droit", () => {
    expect(jointAngle({ x: 1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0, y: 1, z: 0 })).toBeCloseTo(90);
  });
  it("est robuste à l'échelle (mêmes angles quelle que soit la morphologie)", () => {
    const small = jointAngle({ x: 0.1, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 0.1, y: 0.1, z: 0 });
    const big = jointAngle({ x: 10, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 10, y: 10, z: 0 });
    expect(small).toBeCloseTo(big);
  });
  it("renvoie NaN si deux points sont confondus", () => {
    expect(jointAngle({ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 })).toBeNaN();
  });
});

describe("leanFromVertical", () => {
  it("renvoie 0 pour un segment vertical", () => {
    expect(leanFromVertical({ x: 0, y: 0, z: 0 }, { x: 0, y: -1, z: 0 })).toBeCloseTo(0);
  });
  it("renvoie 45° pour une diagonale", () => {
    expect(leanFromVertical({ x: 0, y: 0, z: 0 }, { x: 1, y: -1, z: 0 })).toBeCloseTo(45);
  });
});

describe("AngleSmoother", () => {
  const base = {
    kneeL: 100, kneeR: 100, hipL: 100, hipR: 100,
    shoulderL: 20, shoulderR: 20, ankleL: 95, ankleR: 95, trunkLean: 10,
  };
  it("renvoie la première valeur telle quelle", () => {
    expect(new AngleSmoother(0.5).next(base)).toEqual(base);
  });
  it("lisse les valeurs suivantes", () => {
    const s = new AngleSmoother(0.5);
    s.next(base);
    expect(s.next({ ...base, kneeL: 200 }).kneeL).toBeCloseTo(150);
  });
  it("ignore les NaN et garde la dernière valeur valide", () => {
    const s = new AngleSmoother(0.5);
    s.next(base);
    expect(s.next({ ...base, kneeL: NaN }).kneeL).toBe(100);
  });
});
