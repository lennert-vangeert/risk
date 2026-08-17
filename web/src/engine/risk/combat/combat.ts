/**
 * Exact dice-combat probability math for Risk. No simulation, no randomness —
 * closed-form single-throw tables plus an exact memoized Markov recursion over
 * (attacker, defender) army counts. This is what makes the advisor's odds
 * deterministic and reproducible.
 *
 * Convention: `atk` and `def` are the TOTAL armies on the attacking and
 * defending territories. The attacker must leave one army behind, so the
 * disposable attacking force is `atk - 1`; a legal attack needs `atk >= 2` and
 * `def >= 1`. Attacker rolls `min(3, atk-1)` dice, defender rolls `min(2, def)`;
 * the defender wins ties. Both sides are assumed to roll the maximum number of
 * dice available (the EV-optimal play), which is what the advisor recommends.
 */

export type AtkDiceCount = 1 | 2 | 3;
export type DefDiceCount = 1 | 2;

export interface ExactOutcome {
  atkLoss: number;
  defLoss: number;
  num: number;
  den: number;
}

/**
 * Source of truth: exact single-throw probabilities as integer fractions, keyed
 * `"<atkDice>-<defDice>"`. These are the canonical published Risk values; the
 * float runtime table and the BigInt test reference both derive from here.
 */
export const SINGLE_THROW_EXACT: Record<string, ExactOutcome[]> = {
  "3-2": [
    { atkLoss: 0, defLoss: 2, num: 2890, den: 7776 },
    { atkLoss: 1, defLoss: 1, num: 2611, den: 7776 },
    { atkLoss: 2, defLoss: 0, num: 2275, den: 7776 },
  ],
  "3-1": [
    { atkLoss: 0, defLoss: 1, num: 855, den: 1296 },
    { atkLoss: 1, defLoss: 0, num: 441, den: 1296 },
  ],
  "2-2": [
    { atkLoss: 0, defLoss: 2, num: 295, den: 1296 },
    { atkLoss: 1, defLoss: 1, num: 420, den: 1296 },
    { atkLoss: 2, defLoss: 0, num: 581, den: 1296 },
  ],
  "2-1": [
    { atkLoss: 0, defLoss: 1, num: 125, den: 216 },
    { atkLoss: 1, defLoss: 0, num: 91, den: 216 },
  ],
  "1-2": [
    { atkLoss: 0, defLoss: 1, num: 55, den: 216 },
    { atkLoss: 1, defLoss: 0, num: 161, den: 216 },
  ],
  "1-1": [
    { atkLoss: 0, defLoss: 1, num: 15, den: 36 },
    { atkLoss: 1, defLoss: 0, num: 21, den: 36 },
  ],
};

export interface ThrowOutcome {
  atkLoss: number;
  defLoss: number;
  p: number;
}

const throwKey = (atkDice: AtkDiceCount, defDice: DefDiceCount): string =>
  `${atkDice}-${defDice}`;

const FLOAT_TABLE: Record<string, ThrowOutcome[]> = Object.fromEntries(
  Object.entries(SINGLE_THROW_EXACT).map(([k, outcomes]) => [
    k,
    outcomes.map((o) => ({
      atkLoss: o.atkLoss,
      defLoss: o.defLoss,
      p: o.num / o.den,
    })),
  ])
);

/** Probability distribution of one dice throw for the given dice counts. */
export const singleThrow = (
  atkDice: AtkDiceCount,
  defDice: DefDiceCount
): ThrowOutcome[] => FLOAT_TABLE[throwKey(atkDice, defDice)];

export interface BattleResult {
  /** Probability the attacker takes the territory (defenders reach 0). */
  pConquer: number;
  /**
   * survivorDist[s] = P(conquer AND exactly s disposable attacking armies
   * survive) — i.e. armies free to occupy the conquered territory, s in
   * 1..atk-1. Index 0 is always 0 (a conquest always leaves >= 1 disposable).
   */
  survivorDist: number[];
  /** repelledDist[r] = P(repelled AND exactly r defenders remain), r in 1..def. */
  repelledDist: number[];
  /** Expected disposable survivors, conditioned on conquest. */
  expectedSurvivorsGivenConquer: number;
  /** Expected disposable survivors overall (0 when repelled). */
  expectedSurvivorsUnconditional: number;
}

const cache = new Map<number, BattleResult>();
const cacheKey = (atk: number, def: number): number => atk * 1000 + def;

/** Exact outcome distribution of attacking `to the end` from (atk, def). Memoized. */
export function battle(atk: number, def: number): BattleResult {
  const key = cacheKey(atk, def);
  const cached = cache.get(key);
  if (cached) return cached;
  const result = computeBattle(atk, def);
  cache.set(key, result);
  return result;
}

function computeBattle(atk: number, def: number): BattleResult {
  const a0 = atk - 1; // disposable attacking force
  const survivorDist = new Array<number>(Math.max(atk, 1)).fill(0);
  const repelledDist = new Array<number>(def + 1).fill(0);

  // Illegal / trivial cases.
  if (def <= 0) {
    // Nothing to defend — treat as an immediate conquest with all survivors.
    if (a0 >= 1) survivorDist[a0] = 1;
    return finalize(survivorDist, repelledDist);
  }
  if (a0 < 1) {
    // Not enough armies to attack — guaranteed repel with all defenders intact.
    repelledDist[def] = 1;
    return finalize(survivorDist, repelledDist);
  }

  // Memoized recursion over (a disposable, d defenders). Distributions are
  // accumulated into full-size arrays indexed by absolute survivor/defender
  // counts, so results compose cleanly up the tree.
  const memo = new Map<number, { surv: Float64Array; rep: Float64Array }>();

  const solve = (a: number, d: number): { surv: Float64Array; rep: Float64Array } => {
    if (d === 0) {
      const surv = new Float64Array(a0 + 1);
      surv[a] = 1;
      return { surv, rep: new Float64Array(def + 1) };
    }
    if (a === 0) {
      const rep = new Float64Array(def + 1);
      rep[d] = 1;
      return { surv: new Float64Array(a0 + 1), rep };
    }
    const mk = a * (def + 1) + d;
    const hit = memo.get(mk);
    if (hit) return hit;

    const atkDice = Math.min(3, a) as AtkDiceCount;
    const defDice = Math.min(2, d) as DefDiceCount;
    const surv = new Float64Array(a0 + 1);
    const rep = new Float64Array(def + 1);
    for (const o of singleThrow(atkDice, defDice)) {
      const sub = solve(a - o.atkLoss, d - o.defLoss);
      for (let i = 0; i < surv.length; i++) surv[i] += o.p * sub.surv[i];
      for (let j = 0; j < rep.length; j++) rep[j] += o.p * sub.rep[j];
    }
    const res = { surv, rep };
    memo.set(mk, res);
    return res;
  };

  const { surv, rep } = solve(a0, def);
  for (let i = 0; i < survivorDist.length; i++) survivorDist[i] = surv[i] ?? 0;
  for (let j = 0; j < repelledDist.length; j++) repelledDist[j] = rep[j] ?? 0;
  return finalize(survivorDist, repelledDist);
}

function finalize(survivorDist: number[], repelledDist: number[]): BattleResult {
  let pConquer = 0;
  let expected = 0;
  for (let s = 0; s < survivorDist.length; s++) {
    pConquer += survivorDist[s];
    expected += s * survivorDist[s];
  }
  return {
    pConquer,
    survivorDist,
    repelledDist,
    expectedSurvivorsGivenConquer: pConquer > 0 ? expected / pConquer : 0,
    expectedSurvivorsUnconditional: expected,
  };
}

/** Probability the attacker conquers, attacking to the end. */
export const pConquer = (atk: number, def: number): number =>
  battle(atk, def).pConquer;

/** Expected disposable survivors given the attacker conquers. */
export const expectedSurvivors = (atk: number, def: number): number =>
  battle(atk, def).expectedSurvivorsGivenConquer;

/** Probability of conquering with at least `minSurvivors` disposable armies left. */
export const pConquerWithAtLeast = (
  atk: number,
  def: number,
  minSurvivors: number
): number => {
  const { survivorDist } = battle(atk, def);
  let sum = 0;
  for (let s = Math.max(0, minSurvivors); s < survivorDist.length; s++) {
    sum += survivorDist[s];
  }
  return sum;
};

/**
 * The least total attacking armies needed to conquer `def` defenders with
 * probability >= `pTarget`. Returns null if unreachable within `cap`.
 */
export const minArmiesFor = (
  pTarget: number,
  def: number,
  cap = 100
): number | null => {
  for (let atk = 2; atk <= cap; atk++) {
    if (battle(atk, def).pConquer >= pTarget) return atk;
  }
  return null;
};
