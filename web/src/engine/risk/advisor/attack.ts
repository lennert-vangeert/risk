import { type TerritoryId } from "../board/territories";
import { battle, type BattleResult } from "../combat/combat";
import { ownedTerritories } from "../rules/reinforcements";
import { getPlayer } from "../reducer/helpers";
import { type GameState, type Player } from "../state/state";
import { type Mission } from "../missions/types";
import {
  enemyNeighbors,
  isLastTerritory,
  missionRelevance,
  weightsFor,
  wouldBreakBonus,
  wouldCompleteContinent,
  type Weights,
} from "./scoring";
import { type Recommendation } from "./types";

/** Minimum conquest probability for the "secure a card" recommendation. */
const CARD_MIN_ODDS = 0.7;
const TAKE_CARD_BOOST = 50;

type Candidate = { from: TerritoryId; to: TerritoryId; battle: BattleResult };

const strategicValue = (
  state: GameState,
  playerId: string,
  to: TerritoryId,
  weights: Weights,
  mission: Mission | null
): number => {
  let value = 1;
  if (wouldCompleteContinent(state, playerId, to)) value += 3;
  if (wouldBreakBonus(state, to)) value += 2;
  if (isLastTerritory(state, to)) {
    const owner = state.territories[to].ownerId;
    const victim = owner ? getPlayer(state, owner) : undefined;
    value += 1 + (victim?.cardCount ?? 0) * 0.5;
  }
  value += missionRelevance(state, playerId, to, mission) * weights.mission;
  return value;
};

const attackReason = (
  state: GameState,
  playerId: string,
  to: TerritoryId,
  mission: Mission | null
): string => {
  if (wouldCompleteContinent(state, playerId, to))
    return "attack.completeContinent";
  if (isLastTerritory(state, to)) return "attack.eliminate";
  if (wouldBreakBonus(state, to)) return "attack.breakBonus";
  if (missionRelevance(state, playerId, to, mission) > 0)
    return "attack.mission";
  return "attack.favorable";
};

export const attackRecommendations = (
  state: GameState,
  goof: Player
): Recommendation[] => {
  const weights = weightsFor(state);
  const mission = state.missions.goofball;

  const candidates: Candidate[] = [];
  for (const from of ownedTerritories(state, goof.id)) {
    if (state.territories[from].armies < 2) continue;
    for (const to of enemyNeighbors(state, goof.id, from)) {
      candidates.push({
        from,
        to,
        battle: battle(
          state.territories[from].armies,
          state.territories[to].armies
        ),
      });
    }
  }

  const recs: Recommendation[] = candidates.map((c) => ({
    kind: "attack",
    from: c.from,
    to: c.to,
    pConquer: c.battle.pConquer,
    expectedSurvivors: c.battle.expectedSurvivorsGivenConquer,
    score: c.battle.pConquer * strategicValue(state, goof.id, c.to, weights, mission),
    reasonKey: attackReason(state, goof.id, c.to, mission),
    reasonParams: {
      from: c.from,
      to: c.to,
      pct: Math.round(c.battle.pConquer * 100),
    },
    tiebreak: `attack:${c.from}:${c.to}`,
  }));

  // Card guarantee: if goofball hasn't conquered yet, promote the safest attack.
  if (!state.turn.conqueredThisTurn && candidates.length > 0) {
    const safest = [...candidates].sort(
      (a, b) =>
        b.battle.pConquer - a.battle.pConquer ||
        (`${a.from}:${a.to}` < `${b.from}:${b.to}` ? -1 : 1)
    )[0];
    if (safest.battle.pConquer >= CARD_MIN_ODDS || recs.length === 1) {
      const rec = recs.find(
        (r) => r.kind === "attack" && r.from === safest.from && r.to === safest.to
      );
      if (rec && rec.kind === "attack") {
        rec.score += TAKE_CARD_BOOST;
        rec.reasonKey = "attack.takeCard";
      }
    }
  }

  recs.push(stopRecommendation(candidates));
  return recs;
};

/** A "consider stopping" option, stronger when no attack has good odds. */
const stopRecommendation = (candidates: Candidate[]): Recommendation => {
  const bestP = candidates.reduce((m, c) => Math.max(m, c.battle.pConquer), 0);
  return {
    kind: "stop",
    score: Math.max(1, (1 - bestP) * 3),
    reasonKey: "attack.stop",
    reasonParams: {},
    tiebreak: "stop",
  };
};
