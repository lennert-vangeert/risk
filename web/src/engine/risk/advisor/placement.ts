import { type TerritoryId } from "../board/territories";
import { ownedTerritories } from "../rules/reinforcements";
import { type GameState, type Player } from "../state/state";
import { type Mission } from "../missions/types";
import {
  borderThreat,
  continentDefendValue,
  missionRelevance,
  placementValue,
  weightsFor,
} from "./scoring";
import { type Recommendation } from "./types";

const placeReason = (
  state: GameState,
  playerId: string,
  t: TerritoryId,
  mission: Mission | null
): string => {
  if (missionRelevance(state, playerId, t, mission) > 0) return "place.mission";
  if (continentDefendValue(state, playerId, t) > 0)
    return "place.defendContinent";
  if (borderThreat(state, playerId, t) > 0) return "place.defendBorder";
  return "place.stage";
};

/**
 * Rank reinforcement placements. Armies are assigned greedily one at a time to
 * the highest-value owned territory, recomputing after each placement (adding
 * armies lowers a territory's own threat), so the result spreads sensibly
 * instead of dumping everything on a single square.
 */
export const placementRecommendations = (
  state: GameState,
  goof: Player
): Recommendation[] => {
  const remaining = state.turn.reinforcementsRemaining;
  if (remaining <= 0) return [];
  const weights = weightsFor(state);
  const mission = state.missions.goofball;
  const owned = ownedTerritories(state, goof.id);
  if (owned.length === 0) return [];

  const work = structuredClone(state);
  const counts: Partial<Record<TerritoryId, number>> = {};

  for (let i = 0; i < remaining; i++) {
    let best: TerritoryId = owned[0];
    let bestScore = -Infinity;
    for (const t of owned) {
      const score = placementValue(work, goof.id, t, weights, mission);
      if (score > bestScore || (score === bestScore && t < best)) {
        best = t;
        bestScore = score;
      }
    }
    work.territories[best].armies += 1;
    counts[best] = (counts[best] ?? 0) + 1;
  }

  return (Object.entries(counts) as [TerritoryId, number][]).map(([t, n]) => ({
    kind: "place",
    territory: t,
    armies: n,
    score: placementValue(state, goof.id, t, weights, mission) + n * 0.01,
    reasonKey: placeReason(state, goof.id, t, mission),
    reasonParams: { territory: t, armies: n },
    tiebreak: `place:${t}`,
  }));
};
