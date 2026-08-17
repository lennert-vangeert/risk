import { TERRITORY_IDS, type TerritoryId } from "../board/territories";

/**
 * Risk cards. There are 44: 42 territory cards (each showing one of three
 * symbols) plus 2 wilds. Only goofball's own hand is tracked as explicit cards;
 * opponents are tracked as counts (their symbols are unknown across the table).
 */
export type CardSymbol = "infantry" | "cavalry" | "artillery";

export type Card =
  | { kind: "territory"; territory: TerritoryId; symbol: CardSymbol }
  | { kind: "wild"; id: "wild1" | "wild2" };

export type DeckComposition = {
  infantry: number;
  cavalry: number;
  artillery: number;
  wild: number;
};

/** Classic 44-card deck: 14 of each symbol + 2 wilds. */
export const DEFAULT_DECK_COMPOSITION: DeckComposition = {
  infantry: 14,
  cavalry: 14,
  artillery: 14,
  wild: 2,
};

const SYMBOL_CYCLE: CardSymbol[] = ["infantry", "cavalry", "artillery"];

/**
 * Default territory -> symbol mapping. Editions differ on the exact printing, so
 * this lives in ruleset config and is swappable; the cyclic assignment yields
 * exactly 14/14/14 over the 42 territories.
 */
export const DEFAULT_CARD_SYMBOL_BY_TERRITORY: Record<TerritoryId, CardSymbol> =
  (() => {
    const map = {} as Record<TerritoryId, CardSymbol>;
    TERRITORY_IDS.forEach((t, i) => {
      map[t] = SYMBOL_CYCLE[i % SYMBOL_CYCLE.length];
    });
    return map;
  })();

export const isWild = (card: Card): boolean => card.kind === "wild";

/** The three-symbol identity of a card; wilds return null (they match anything). */
export const symbolOf = (card: Card): CardSymbol | null =>
  card.kind === "territory" ? card.symbol : null;

/**
 * Whether three cards form a valid trade-in set: three of the same symbol,
 * one of each symbol, or any trio containing at least one wild (a wild
 * completes either kind of set).
 */
export const isValidSet = (cards: Card[]): boolean => {
  if (cards.length !== 3) return false;
  if (cards.some(isWild)) return true;
  const symbols = cards.map((c) => symbolOf(c)!);
  const distinct = new Set(symbols).size;
  return distinct === 1 || distinct === 3;
};

/** Every valid 3-card set that can be formed from a hand. */
export const enumerateSets = (hand: Card[]): Card[][] => {
  const sets: Card[][] = [];
  for (let i = 0; i < hand.length; i++) {
    for (let j = i + 1; j < hand.length; j++) {
      for (let k = j + 1; k < hand.length; k++) {
        const trio = [hand[i], hand[j], hand[k]];
        if (isValidSet(trio)) sets.push(trio);
      }
    }
  }
  return sets;
};

/**
 * The army value of the next set traded in, given how many sets have already
 * been traded worldwide (escalating variant). Reads the ruleset schedule and
 * extrapolates `+5` per set beyond its end.
 */
export const setValue = (
  setsTradedInBefore: number,
  schedule: number[]
): number => {
  if (setsTradedInBefore < schedule.length) return schedule[setsTradedInBefore];
  const last = schedule[schedule.length - 1];
  return last + 5 * (setsTradedInBefore - (schedule.length - 1));
};

/** Count of each symbol (wilds bucketed under `wild`) in a card list. */
export const countBySymbol = (cards: Card[]): DeckComposition => {
  const counts: DeckComposition = {
    infantry: 0,
    cavalry: 0,
    artillery: 0,
    wild: 0,
  };
  for (const card of cards) {
    if (card.kind === "wild") counts.wild += 1;
    else counts[card.symbol] += 1;
  }
  return counts;
};

/**
 * Among a set's territory cards, the first that the player owns — this grants
 * the +2 territory-match bonus. Returns null if none match.
 */
export const setTerritoryMatch = (
  set: Card[],
  ownedTerritories: ReadonlySet<TerritoryId>
): TerritoryId | null => {
  for (const card of set) {
    if (card.kind === "territory" && ownedTerritories.has(card.territory)) {
      return card.territory;
    }
  }
  return null;
};
