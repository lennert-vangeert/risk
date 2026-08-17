import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import {
  CONTINENTS,
  CONTINENT_OF,
  type ContinentId,
} from "../board/continents";
import {
  neighborsOf,
  isBorderTerritory,
} from "../board/index";
import { pConquer } from "../combat/combat";
import { controlledContinents } from "../rules/reinforcements";
import { type GameState } from "../state/state";
import { type PlayerId } from "../state/ids";
import { type Mission } from "../missions/types";

/** Weight vector tuning how the shared value function trades off objectives. */
export type Weights = {
  threat: number;
  choke: number;
  continentDefend: number;
  continentComplete: number;
  mission: number;
  staging: number;
};

export const DOMINATION_WEIGHTS: Weights = {
  threat: 1.0,
  choke: 0.6,
  continentDefend: 1.0,
  continentComplete: 1.2,
  mission: 0.0,
  staging: 0.5,
};

export const MISSION_WEIGHTS: Weights = {
  threat: 0.8,
  choke: 0.4,
  continentDefend: 0.7,
  continentComplete: 0.9,
  mission: 2.5,
  staging: 0.6,
};

export const weightsFor = (state: GameState): Weights =>
  state.config.winCondition === "secret_mission"
    ? MISSION_WEIGHTS
    : DOMINATION_WEIGHTS;

/** Enemy-owned neighbours of a territory. */
export const enemyNeighbors = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): TerritoryId[] =>
  neighborsOf(t).filter((n) => {
    const owner = state.territories[n].ownerId;
    return owner !== null && owner !== playerId;
  });

/** Whether an owned territory has at least one enemy neighbour. */
export const isFrontline = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): boolean =>
  state.territories[t].ownerId === playerId &&
  enemyNeighbors(state, playerId, t).length > 0;

/**
 * How threatened an owned territory is: the sum over enemy neighbours of the
 * probability that neighbour conquers it, weighted by the attacker's size.
 * This is the defence-side use of the exact combat math.
 */
export const borderThreat = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): number => {
  const defenders = state.territories[t].armies;
  let threat = 0;
  for (const e of enemyNeighbors(state, playerId, t)) {
    const attackers = state.territories[e].armies;
    threat += pConquer(attackers, defenders) * attackers;
  }
  return threat;
};

/** Best offensive potential from an owned territory (max conquest prob × target size). */
export const stagingValue = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): number => {
  const attackers = state.territories[t].armies;
  let best = 0;
  for (const e of enemyNeighbors(state, playerId, t)) {
    const value =
      pConquer(attackers, state.territories[e].armies) *
      (1 + state.territories[e].armies * 0.1);
    if (value > best) best = value;
  }
  return best;
};

/** Value of defending an owned border of a continent goofball fully controls. */
export const continentDefendValue = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): number => {
  const continent = CONTINENT_OF[t];
  const controlled = controlledContinents(state, playerId);
  if (!controlled.includes(continent)) return 0;
  if (!isBorderTerritory(t)) return 0;
  return CONTINENTS[continent].bonus;
};

/** How close goofball is to completing the continent this territory sits in (0..1). */
export const continentCompleteValue = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId
): number => {
  const continent = CONTINENT_OF[t];
  const members = CONTINENTS[continent].territories;
  const owned = members.filter(
    (m) => state.territories[m].ownerId === playerId
  ).length;
  if (owned === members.length) return 0; // already complete
  const fraction = owned / members.length;
  // Reward continents you nearly hold, scaled by the bonus at stake.
  return fraction * fraction * CONTINENTS[continent].bonus;
};

/** Continents relevant to goofball's mission (empty for non-continent missions). */
export const missionContinents = (mission: Mission | null): ContinentId[] => {
  if (!mission) return [];
  if (mission.type === "conquer_continents") return mission.continents;
  return [];
};

/**
 * Whether a territory advances goofball's own mission — it sits in a continent
 * the mission needs, or (for capture missions) counts toward the total.
 */
export const missionRelevance = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId,
  mission: Mission | null
): number => {
  if (!mission) return 0;
  switch (mission.type) {
    case "conquer_continents":
      return mission.continents.includes(CONTINENT_OF[t]) ? 1 : 0;
    case "hold_n_continents": {
      // Continents goofball nearly holds are the mission path.
      const c = CONTINENT_OF[t];
      const members = CONTINENTS[c].territories;
      const owned = members.filter(
        (m) => state.territories[m].ownerId === playerId
      ).length;
      return owned / members.length >= 0.5 && owned < members.length ? 1 : 0;
    }
    case "capture_territories":
      return state.territories[t].ownerId === playerId ? 0.2 : 0.4;
    case "eliminate_color": {
      const target = state.players.find(
        (p) => p.color === mission.targetColor
      );
      return target && state.territories[t].ownerId === target.id ? 1 : 0;
    }
  }
};

/**
 * The shared per-owned-territory value used by placement and fortify. Deep
 * interior territories (no enemy neighbour, not mission-relevant) score ~0.
 */
export const placementValue = (
  state: GameState,
  playerId: PlayerId,
  t: TerritoryId,
  weights: Weights,
  mission: Mission | null
): number =>
  weights.threat * borderThreat(state, playerId, t) +
  weights.choke * (isFrontline(state, playerId, t) && isBorderTerritory(t) ? 1 : 0) +
  weights.continentDefend * continentDefendValue(state, playerId, t) +
  weights.continentComplete *
    (isFrontline(state, playerId, t)
      ? continentCompleteValue(state, playerId, t)
      : 0) +
  weights.mission * missionRelevance(state, playerId, t, mission) +
  weights.staging * stagingValue(state, playerId, t);

/** Whether taking `to` would complete a continent for goofball. */
export const wouldCompleteContinent = (
  state: GameState,
  playerId: PlayerId,
  to: TerritoryId
): boolean => {
  const members = CONTINENTS[CONTINENT_OF[to]].territories;
  return members.every(
    (m) => m === to || state.territories[m].ownerId === playerId
  );
};

/** Whether the current owner of `to` currently earns a continent bonus that taking it breaks. */
export const wouldBreakBonus = (
  state: GameState,
  to: TerritoryId
): boolean => {
  const owner = state.territories[to].ownerId;
  if (owner === null) return false;
  const members = CONTINENTS[CONTINENT_OF[to]].territories;
  return members.every((m) => state.territories[m].ownerId === owner);
};

/** Whether `to` is the last territory its owner holds. */
export const isLastTerritory = (state: GameState, to: TerritoryId): boolean => {
  const owner = state.territories[to].ownerId;
  if (owner === null) return false;
  return (
    TERRITORY_IDS.filter((t) => state.territories[t].ownerId === owner)
      .length === 1
  );
};
