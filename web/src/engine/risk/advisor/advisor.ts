import { CONTINENT_IDS, CONTINENTS } from "../board/continents";
import { nextSetValue } from "../rules/reinforcements";
import { threatAssessment } from "../missions/missions";
import { type GameState, type Player } from "../state/state";
import { tradeInRecommendations } from "./tradeIn";
import { placementRecommendations } from "./placement";
import { attackRecommendations } from "./attack";
import { fortifyRecommendations } from "./fortify";
import { defenseRecommendations } from "./defense";
import { type Advice, type Recommendation, type ThreatFlag } from "./types";

const goofballOf = (state: GameState): Player | undefined =>
  state.players.find((p) => p.isGoofball);

/** Stable total order: score desc, then the deterministic tiebreak string asc. */
const sortRecommendations = (recs: Recommendation[]): Recommendation[] =>
  [...recs].sort(
    (a, b) => b.score - a.score || (a.tiebreak < b.tiebreak ? -1 : a.tiebreak > b.tiebreak ? 1 : 0)
  );

/** Watch-list of opponent dangers, sorted most urgent first. */
const buildThreatFlags = (state: GameState): ThreatFlag[] => {
  const flags: ThreatFlag[] = [];

  for (const opp of state.players) {
    if (opp.isGoofball || opp.eliminated) continue;

    // About to complete a continent (owns all but one of it).
    for (const c of CONTINENT_IDS) {
      const members = CONTINENTS[c].territories;
      const owned = members.filter(
        (t) => state.territories[t].ownerId === opp.id
      ).length;
      if (owned === members.length - 1) {
        flags.push({
          reasonKey: "threat.continentSoon",
          reasonParams: { player: opp.name, continent: c },
          urgency: 0.65,
        });
      }
    }

    // Holding a tradeable set.
    if (opp.cardCount >= 3) {
      flags.push({
        reasonKey: "threat.cardSet",
        reasonParams: {
          player: opp.name,
          cards: opp.cardCount,
          value: nextSetValue(state),
        },
        urgency: Math.min(0.9, 0.4 + nextSetValue(state) / 40),
      });
    }

    // Suspected missions goofball has logged.
    for (const suspected of state.missions.suspected[opp.id] ?? []) {
      const assessment = threatAssessment(state, opp.id, suspected.mission);
      flags.push({
        reasonKey: "threat.mission",
        reasonParams: {
          player: opp.name,
          progress: assessment.progress.label,
        },
        urgency: assessment.urgency,
        denialTerritories: assessment.denialTerritories,
      });
    }
  }

  return flags.sort((a, b) => b.urgency - a.urgency);
};

/**
 * The single entry point: given the game state, return goofball's ranked
 * recommendations for the current phase plus a threat watch-list. Pure and
 * deterministic — the same state always yields the same advice.
 */
export const advise = (state: GameState): Advice => {
  const goof = goofballOf(state);
  const phase = state.turn.phase;
  if (!goof || goof.eliminated || phase === "game_over" || state.winnerId) {
    return { phase, recommendations: [], flags: [] };
  }

  const flags = buildThreatFlags(state);

  // Opponent's turn: goofball can only defend / watch.
  if (state.turn.currentPlayerId !== goof.id) {
    return {
      phase,
      recommendations: sortRecommendations(defenseRecommendations(state, goof)),
      flags,
    };
  }

  let recs: Recommendation[] = [];
  switch (phase) {
    case "reinforce":
      recs = [
        ...tradeInRecommendations(state, goof),
        ...placementRecommendations(state, goof),
      ];
      break;
    case "attack":
      recs = attackRecommendations(state, goof);
      break;
    case "fortify":
      recs = fortifyRecommendations(state, goof);
      break;
    case "setup_claim":
    case "setup_deploy":
      recs = [];
      break;
  }

  return { phase, recommendations: sortRecommendations(recs), flags };
};
