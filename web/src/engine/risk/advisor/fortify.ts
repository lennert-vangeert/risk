import { type TerritoryId } from "../board/territories";
import { areAdjacent } from "../board/index";
import { ownedTerritories } from "../rules/reinforcements";
import { connectedThroughOwn } from "../reducer/phase";
import { type GameState, type Player } from "../state/state";
import {
  borderThreat,
  isFrontline,
  missionRelevance,
  stagingValue,
  weightsFor,
} from "./scoring";
import { type Recommendation } from "./types";

/**
 * Recommend the single best fortify: pull the surplus off a safe interior
 * territory (no enemy neighbours) and feed the most valuable reachable
 * frontline / mission-path territory. Returns nothing when there's no surplus
 * interior army to move.
 */
export const fortifyRecommendations = (
  state: GameState,
  goof: Player
): Recommendation[] => {
  const owned = ownedTerritories(state, goof.id);
  const weights = weightsFor(state);
  const mission = state.missions.goofball;

  const interiors = owned.filter(
    (t) =>
      state.territories[t].armies >= 2 && borderThreat(state, goof.id, t) === 0
  );
  const frontlines = owned.filter((t) => isFrontline(state, goof.id, t));
  if (interiors.length === 0 || frontlines.length === 0) return [];

  let best: { from: TerritoryId; to: TerritoryId; count: number } | null = null;
  let bestScore = 0;

  for (const from of interiors) {
    const surplus = state.territories[from].armies - 1;
    for (const to of frontlines) {
      if (to === from) continue;
      const reachable =
        state.config.fortifyMode === "adjacent"
          ? areAdjacent(from, to)
          : connectedThroughOwn(state, goof.id, from, to);
      if (!reachable) continue;
      const destValue =
        borderThreat(state, goof.id, to) +
        stagingValue(state, goof.id, to) +
        weights.mission * missionRelevance(state, goof.id, to, mission);
      const score = destValue * surplus;
      const better =
        score > bestScore ||
        (score === bestScore &&
          best !== null &&
          `${from}:${to}` < `${best.from}:${best.to}`);
      if (better) {
        bestScore = score;
        best = { from, to, count: surplus };
      }
    }
  }

  if (!best || bestScore <= 0) return [];
  return [
    {
      kind: "fortify",
      from: best.from,
      to: best.to,
      count: best.count,
      score: bestScore,
      reasonKey: "fortify.consolidate",
      reasonParams: { from: best.from, to: best.to, count: best.count },
      tiebreak: `fortify:${best.from}:${best.to}`,
    },
  ];
};
