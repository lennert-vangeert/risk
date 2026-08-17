import { describe, it, expect } from "vitest";
import {
  SINGLE_THROW_EXACT,
  singleThrow,
  battle,
  pConquer,
  expectedSurvivors,
  pConquerWithAtLeast,
  minArmiesFor,
} from "./combat";
import { addR, mulR, rat, toNumber, ONE, ZERO, type Rational } from "./rational";

// Exact rational reference for pConquer — mirrors the runtime Markov recursion
// but in exact BigInt arithmetic, sharing the same SINGLE_THROW_EXACT source.
function pConquerExact(atk: number, def: number): Rational {
  const a0 = atk - 1;
  if (def <= 0) return ONE;
  if (a0 < 1) return ZERO;
  const memo = new Map<number, Rational>();
  const solve = (a: number, d: number): Rational => {
    if (d === 0) return ONE;
    if (a === 0) return ZERO;
    const mk = a * (def + 1) + d;
    const hit = memo.get(mk);
    if (hit) return hit;
    const atkDice = Math.min(3, a);
    const defDice = Math.min(2, d);
    let acc = ZERO;
    for (const o of SINGLE_THROW_EXACT[`${atkDice}-${defDice}`]) {
      acc = addR(acc, mulR(rat(o.num, o.den), solve(a - o.atkLoss, d - o.defLoss)));
    }
    memo.set(mk, acc);
    return acc;
  };
  return solve(a0, def);
}

describe("single-throw tables", () => {
  it("each combo is a valid probability distribution (exact and float)", () => {
    for (const [k, outcomes] of Object.entries(SINGLE_THROW_EXACT)) {
      const den = outcomes[0].den;
      const num = outcomes.reduce((s, o) => s + o.num, 0);
      expect(num, `${k} exact sums to 1`).toBe(den);
      const [atkDice, defDice] = k.split("-").map(Number);
      const floatSum = singleThrow(
        atkDice as 1 | 2 | 3,
        defDice as 1 | 2
      ).reduce((s, o) => s + o.p, 0);
      expect(floatSum, `${k} float sums to 1`).toBeCloseTo(1, 12);
    }
  });

  it("matches the canonical published 3v2 fractions", () => {
    const t = SINGLE_THROW_EXACT["3-2"];
    expect(t.find((o) => o.defLoss === 2)!.num).toBe(2890);
    expect(t.find((o) => o.atkLoss === 1)!.num).toBe(2611);
    expect(t.find((o) => o.atkLoss === 2)!.num).toBe(2275);
  });
});

describe("full-battle pConquer — hand-derived anchors", () => {
  it("pConquer(2,1) = 5/12", () => {
    expect(pConquer(2, 1)).toBeCloseTo(5 / 12, 12);
  });
  it("pConquer(3,1) = 5865/7776", () => {
    expect(pConquer(3, 1)).toBeCloseTo(5865 / 7776, 12);
  });
  it("pConquer(2,2) = 275/2592", () => {
    expect(pConquer(2, 2)).toBeCloseTo(275 / 2592, 12);
  });
  it("pConquer(3,2) = 5640/15552", () => {
    expect(pConquer(3, 2)).toBeCloseTo(5640 / 15552, 12);
  });
  it("expectedSurvivors(3,1) ≈ 1.7672", () => {
    expect(expectedSurvivors(3, 1)).toBeCloseTo(1.76724, 4);
  });
});

describe("full-battle math", () => {
  it("float pConquer matches the exact BigInt reference across a grid", () => {
    for (let atk = 2; atk <= 20; atk++) {
      for (let def = 1; def <= 20; def++) {
        const exact = toNumber(pConquerExact(atk, def));
        expect(
          Math.abs(pConquer(atk, def) - exact),
          `pConquer(${atk},${def})`
        ).toBeLessThan(1e-12);
      }
    }
  });

  it("survivor + repelled distributions sum to 1", () => {
    for (const [atk, def] of [
      [2, 1],
      [5, 3],
      [10, 8],
      [20, 20],
    ] as const) {
      const b = battle(atk, def);
      const total =
        b.survivorDist.reduce((s, x) => s + x, 0) +
        b.repelledDist.reduce((s, x) => s + x, 0);
      expect(total).toBeCloseTo(1, 12);
      expect(b.survivorDist.reduce((s, x) => s + x, 0)).toBeCloseTo(
        b.pConquer,
        12
      );
    }
  });

  it("pConquer is monotonic: increasing in attackers, decreasing in defenders", () => {
    for (let def = 1; def <= 10; def++) {
      for (let atk = 2; atk <= 19; atk++) {
        expect(pConquer(atk + 1, def)).toBeGreaterThanOrEqual(
          pConquer(atk, def)
        );
      }
    }
    for (let atk = 3; atk <= 12; atk++) {
      for (let def = 1; def <= 9; def++) {
        expect(pConquer(atk, def + 1)).toBeLessThanOrEqual(pConquer(atk, def));
      }
    }
  });

  it("minArmiesFor returns the boundary attacker count", () => {
    const need = minArmiesFor(0.7, 3);
    expect(need).not.toBeNull();
    expect(pConquer(need!, 3)).toBeGreaterThanOrEqual(0.7);
    expect(pConquer(need! - 1, 3)).toBeLessThan(0.7);
  });

  it("pConquerWithAtLeast <= pConquer and decreases with the survivor threshold", () => {
    expect(pConquerWithAtLeast(10, 3, 1)).toBeCloseTo(pConquer(10, 3), 12);
    expect(pConquerWithAtLeast(10, 3, 5)).toBeLessThanOrEqual(
      pConquerWithAtLeast(10, 3, 2)
    );
  });

  it("cannot conquer with too few armies", () => {
    expect(pConquer(1, 3)).toBe(0);
  });
});
