import { type TerritoryId } from "../board/territories";
import {
  enumerateSets,
  setTerritoryMatch,
  type Card,
} from "../cards/deck";
import { nextSetValue, ownedTerritories } from "../rules/reinforcements";
import { type GameState, type Player } from "../state/state";
import { placementValue, weightsFor } from "./scoring";
import { type Recommendation } from "./types";

/**
 * Recommend trading in a set. Mandatory when holding >= 5 cards; otherwise
 * suggested when the value is high enough to be worth spending now. Among valid
 * sets, prefer one that lands the +2 territory match on the most valuable owned
 * border.
 */
export const tradeInRecommendations = (
  state: GameState,
  goof: Player
): Recommendation[] => {
  if (goof.cardCount < 3) return [];
  const sets = enumerateSets(state.cards.goofballHand);
  if (sets.length === 0) return [];

  const value = nextSetValue(state);
  const owned = new Set<TerritoryId>(ownedTerritories(state, goof.id));
  const weights = weightsFor(state);
  const mission = state.missions.goofball;

  let bestSet: Card[] = sets[0];
  let bestMatch: TerritoryId | null = null;
  let bestMatchScore = -Infinity;
  for (const set of sets) {
    const match = setTerritoryMatch(set, owned);
    const matchScore = match
      ? placementValue(state, goof.id, match, weights, mission)
      : -1;
    if (matchScore > bestMatchScore) {
      bestMatchScore = matchScore;
      bestSet = set;
      bestMatch = match;
    }
  }

  const mandatory = goof.cardCount >= 5;
  const highValue = value >= 10;
  const score = mandatory ? 100 + value : highValue ? 20 + value : 5 + value;
  const reasonKey = mandatory
    ? "tradeIn.mandatory"
    : highValue
      ? "tradeIn.highValue"
      : "tradeIn.optional";

  return [
    {
      kind: "trade_in",
      cards: bestSet as [Card, Card, Card],
      matchTerritory: bestMatch ?? undefined,
      value,
      score,
      reasonKey,
      reasonParams: { value },
      tiebreak: "tradeIn",
    },
  ];
};
