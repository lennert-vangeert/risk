import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import {
  CONTINENT_IDS,
  CONTINENTS,
  type ContinentId,
} from "../board/continents";
import { setValue } from "../cards/deck";
import { type GameState } from "../state/state";
import { type PlayerId } from "../state/ids";

/** Territories currently owned by a player. */
export const ownedTerritories = (
  state: GameState,
  playerId: PlayerId
): TerritoryId[] =>
  TERRITORY_IDS.filter((t) => state.territories[t].ownerId === playerId);

/** Base reinforcement from territory count: max(3, floor(owned / 3)). */
export const baseReinforcements = (ownedCount: number): number =>
  Math.max(3, Math.floor(ownedCount / 3));

/** Continents fully controlled by a player. */
export const controlledContinents = (
  state: GameState,
  playerId: PlayerId
): ContinentId[] =>
  CONTINENT_IDS.filter((c) =>
    CONTINENTS[c].territories.every(
      (t) => state.territories[t].ownerId === playerId
    )
  );

/** Total continent-bonus armies for a player. */
export const continentBonus = (state: GameState, playerId: PlayerId): number =>
  controlledContinents(state, playerId).reduce(
    (sum, c) => sum + CONTINENTS[c].bonus,
    0
  );

/** The army value the next traded-in set is worth for this game. */
export const nextSetValue = (state: GameState): number =>
  setValue(state.setsTradedIn, state.config.setSchedule);

export type ReinforcementOptions = {
  /** Army value from a set traded in this turn (if any). */
  tradeValue?: number;
  /** Whether a territory-match bonus applies (adds config.territoryMatchBonus). */
  territoryMatch?: boolean;
};

/**
 * Total reinforcements a player receives at the start of their turn:
 * base (territory/3) + continent bonuses + any traded-set value + territory
 * match bonus. Trade value and match are passed in because they depend on the
 * player's trade-in decision, resolved when the set is actually traded.
 */
export const reinforcementCount = (
  state: GameState,
  playerId: PlayerId,
  opts: ReinforcementOptions = {}
): number => {
  const base = baseReinforcements(ownedTerritories(state, playerId).length);
  const bonus = continentBonus(state, playerId);
  const trade = opts.tradeValue ?? 0;
  const match = opts.territoryMatch ? state.config.territoryMatchBonus : 0;
  return base + bonus + trade + match;
};

/** Whether a hand size forces a trade at the given moment. */
export const mustTrade = (
  handSize: number,
  context: "start_of_turn" | "after_elimination"
): boolean =>
  context === "start_of_turn" ? handSize >= 5 : handSize >= 6;
