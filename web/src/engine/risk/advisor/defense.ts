import { type TerritoryId } from "../board/territories";
import { ownedTerritories } from "../rules/reinforcements";
import { type GameState, type Player } from "../state/state";
import { borderThreat, isFrontline } from "./scoring";
import { type Recommendation } from "./types";

/**
 * Guidance during opponents' turns: defend goofball's most-threatened border,
 * always rolling the maximum dice (the EV-optimal choice). Returns nothing if
 * goofball has no threatened border.
 */
export const defenseRecommendations = (
  state: GameState,
  goof: Player
): Recommendation[] => {
  let target: TerritoryId | null = null;
  let worst = 0;
  for (const t of ownedTerritories(state, goof.id)) {
    if (!isFrontline(state, goof.id, t)) continue;
    const threat = borderThreat(state, goof.id, t);
    if (threat > worst || (threat === worst && target !== null && t < target)) {
      worst = threat;
      target = t;
    }
  }
  if (target === null) return [];
  const dice = Math.min(2, state.territories[target].armies);
  return [
    {
      kind: "defend",
      territory: target,
      dice,
      score: worst,
      reasonKey: "defend.rollMax",
      reasonParams: { territory: target, dice },
      tiebreak: `defend:${target}`,
    },
  ];
};
