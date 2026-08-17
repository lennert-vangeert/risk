/**
 * Public API of the Risk engine — a pure, deterministic, framework-free core.
 * The app (services + UI) imports everything from here via the `@engine` alias:
 *   import { apply, advise, createInitialGame, type GameState } from "@engine/risk";
 */

// Board
export {
  TERRITORY_IDS,
  TERRITORY_COUNT,
  isTerritoryId,
  CONTINENT_IDS,
  CONTINENTS,
  CONTINENT_OF,
  CONTINENT_BORDERS,
  ADJACENCY,
  areAdjacent,
  neighborsOf,
  continentOf,
  territoriesOfContinent,
  isBorderTerritory,
  foreignNeighborsOf,
  type TerritoryId,
  type ContinentId,
  type ContinentDef,
} from "./board/index";

// Combat math
export {
  battle,
  pConquer,
  expectedSurvivors,
  pConquerWithAtLeast,
  minArmiesFor,
  singleThrow,
  SINGLE_THROW_EXACT,
  type BattleResult,
} from "./combat/combat";

// Cards & deck
export {
  DEFAULT_DECK_COMPOSITION,
  DEFAULT_CARD_SYMBOL_BY_TERRITORY,
  isValidSet,
  enumerateSets,
  setValue,
  countBySymbol,
  setTerritoryMatch,
  isWild,
  symbolOf,
  type Card,
  type CardSymbol,
  type DeckComposition,
} from "./cards/deck";
export { deckAccounting, type DeckAccounting } from "./cards/accounting";

// Missions
export {
  isComplete,
  progress,
  threatAssessment,
  eliminateColorMission,
  STANDARD_MISSIONS,
  CONTINENT_MISSIONS,
  TERRITORY_MISSIONS,
  ELIMINATE_FALLBACK,
  type Progress,
  type MissionThreat,
} from "./missions/missions";
export {
  type Mission,
  type SuspectedMission,
  type SuspicionLevel,
} from "./missions/types";

// Reinforcement / setup rules
export {
  ownedTerritories,
  baseReinforcements,
  controlledContinents,
  continentBonus,
  reinforcementCount,
  nextSetValue,
  mustTrade,
} from "./rules/reinforcements";
export {
  DEFAULT_STARTING_ARMIES,
  MIN_PLAYERS,
  MAX_PLAYERS,
  startingArmiesFor,
} from "./rules/setup";

// State, ids, factory
export {
  SCHEMA_VERSION,
  type GameState,
  type Player,
  type TerritoryState,
  type DeckState,
  type TurnState,
  type RulesetConfig,
  type FortifyMode,
} from "./state/state";
export {
  PLAYER_COLORS,
  type PlayerId,
  type PlayerColor,
  type Phase,
  type WinCondition,
} from "./state/ids";
export {
  createInitialGame,
  DEFAULT_CONFIG,
  type NewGameInput,
  type NewPlayerInput,
} from "./state/factory";

// Events
export { type GameEvent, type GameEventType } from "./events/events";

// Reducer
export { apply, canApply, replay, type ApplyResult } from "./reducer/reducer";

// Advisor
export { advise } from "./advisor/advisor";
export {
  type Advice,
  type Recommendation,
  type RecommendationKind,
  type ThreatFlag,
} from "./advisor/types";
