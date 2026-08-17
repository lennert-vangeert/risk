import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import {
  CONTINENTS,
  CONTINENT_OF,
  type ContinentId,
} from "../board/continents";
import { neighborsOf } from "../board/index";
import { controlledContinents, ownedTerritories } from "../rules/reinforcements";
import { type GameState } from "../state/state";
import { type PlayerId, type PlayerColor } from "../state/ids";
import { type Mission } from "./types";

export type Progress = {
  /** 0..1 completion estimate. */
  ratio: number;
  /** Human-friendly label, e.g. "2/3 continents". */
  label: string;
};

/** Territories a player holds with at least `minArmies` armies. */
const territoriesWithArmies = (
  state: GameState,
  playerId: PlayerId,
  minArmies: number
): TerritoryId[] =>
  ownedTerritories(state, playerId).filter(
    (t) => state.territories[t].armies >= minArmies
  );

const resolveColor = (
  state: GameState,
  color: PlayerColor
): GameState["players"][number] | undefined =>
  state.players.find((p) => p.color === color);

/**
 * Whether the eliminate-color mission falls back to "capture 24 territories":
 * the target is the player themselves, isn't in the game, or was eliminated by
 * someone other than the mission holder.
 */
const eliminateFallsBack = (
  state: GameState,
  playerId: PlayerId,
  targetColor: PlayerColor
): boolean => {
  const target = resolveColor(state, targetColor);
  if (!target) return true;
  if (target.id === playerId) return true;
  if (target.eliminated && target.eliminatedBy !== playerId) return true;
  return false;
};

export const isComplete = (
  state: GameState,
  playerId: PlayerId,
  mission: Mission
): boolean => {
  switch (mission.type) {
    case "conquer_continents": {
      const controlled = controlledContinents(state, playerId);
      const controlledSet = new Set<ContinentId>(controlled);
      const hasNamed = mission.continents.every((c) => controlledSet.has(c));
      if (!hasNamed) return false;
      const extraNeeded = mission.plusAny ?? 0;
      return controlled.length >= mission.continents.length + extraNeeded;
    }
    case "hold_n_continents":
      return controlledContinents(state, playerId).length >= mission.count;
    case "capture_territories":
      return (
        territoriesWithArmies(state, playerId, mission.minArmiesEach ?? 1)
          .length >= mission.count
      );
    case "eliminate_color": {
      if (eliminateFallsBack(state, playerId, mission.targetColor)) {
        return isComplete(state, playerId, mission.fallback);
      }
      const target = resolveColor(state, mission.targetColor);
      return !!target && target.eliminated && target.eliminatedBy === playerId;
    }
  }
};

export const progress = (
  state: GameState,
  playerId: PlayerId,
  mission: Mission
): Progress => {
  switch (mission.type) {
    case "conquer_continents": {
      const controlled = new Set(controlledContinents(state, playerId));
      const needed = mission.continents.length + (mission.plusAny ?? 0);
      const have =
        mission.continents.filter((c) => controlled.has(c)).length +
        Math.min(
          mission.plusAny ?? 0,
          [...controlled].filter((c) => !mission.continents.includes(c)).length
        );
      return {
        ratio: needed === 0 ? 1 : Math.min(1, have / needed),
        label: `${have}/${needed} continents`,
      };
    }
    case "hold_n_continents": {
      const have = controlledContinents(state, playerId).length;
      return {
        ratio: Math.min(1, have / mission.count),
        label: `${have}/${mission.count} continents`,
      };
    }
    case "capture_territories": {
      const have = territoriesWithArmies(
        state,
        playerId,
        mission.minArmiesEach ?? 1
      ).length;
      return {
        ratio: Math.min(1, have / mission.count),
        label: `${have}/${mission.count} territories`,
      };
    }
    case "eliminate_color": {
      if (eliminateFallsBack(state, playerId, mission.targetColor)) {
        return progress(state, playerId, mission.fallback);
      }
      const target = resolveColor(state, mission.targetColor);
      if (target?.eliminated) return { ratio: 1, label: "eliminated" };
      const targetOwned = target ? ownedTerritories(state, target.id).length : 0;
      // No reliable starting baseline, so use a coarse proxy: fewer territories
      // left for the target => closer to done.
      const ratio = targetOwned === 0 ? 1 : Math.max(0, 1 - targetOwned / 12);
      return { ratio, label: `eliminate ${mission.targetColor}` };
    }
  }
};

export type MissionThreat = {
  /** 0..1 urgency for goofball. */
  urgency: number;
  progress: Progress;
  /** Territories goofball should hold/deny to slow this mission. */
  denialTerritories: TerritoryId[];
};

/**
 * How dangerous a suspected opponent mission is, and where to deny it. Urgency
 * is the opponent's completion ratio, bumped when they are one continent away.
 */
export const threatAssessment = (
  state: GameState,
  opponentId: PlayerId,
  mission: Mission
): MissionThreat => {
  const prog = progress(state, opponentId, mission);
  const denialTerritories = denialFor(state, opponentId, mission);
  // One step from done (>=0.75) is materially more urgent.
  const urgency = Math.min(1, prog.ratio >= 0.75 ? prog.ratio + 0.15 : prog.ratio);
  return { urgency, progress: prog, denialTerritories };
};

/** Territories the opponent still needs and can reach next — goofball's denial targets. */
const denialFor = (
  state: GameState,
  opponentId: PlayerId,
  mission: Mission
): TerritoryId[] => {
  const neededContinents: ContinentId[] = [];
  if (mission.type === "conquer_continents") {
    neededContinents.push(...mission.continents);
  } else if (mission.type === "hold_n_continents") {
    // Any continent the opponent is closest to — approximate with all continents
    // where they already hold a majority.
    for (const c of Object.keys(CONTINENTS) as ContinentId[]) {
      const members = CONTINENTS[c].territories;
      const owned = members.filter(
        (t) => state.territories[t].ownerId === opponentId
      ).length;
      if (owned > 0 && owned < members.length && owned / members.length >= 0.5) {
        neededContinents.push(c);
      }
    }
  }
  if (neededContinents.length === 0) return [];

  const needSet = new Set(neededContinents);
  const targets = new Set<TerritoryId>();
  for (const t of TERRITORY_IDS) {
    if (!needSet.has(CONTINENT_OF[t])) continue;
    if (state.territories[t].ownerId === opponentId) continue;
    // A territory the opponent is adjacent to is their likely next capture.
    const adjacentToOpponent = neighborsOf(t).some(
      (n) => state.territories[n].ownerId === opponentId
    );
    if (adjacentToOpponent) targets.add(t);
  }
  return [...targets];
};

// ---------------------------------------------------------------------------
// Standard mission catalogue (classic Secret Mission Risk). Continent/territory
// missions are static; eliminate-color missions are built per opponent colour
// because they depend on who is in the game.
// ---------------------------------------------------------------------------

export const CONTINENT_MISSIONS: Mission[] = [
  { type: "conquer_continents", continents: ["asia", "africa"], id: "asia_africa" },
  {
    type: "conquer_continents",
    continents: ["asia", "south_america"],
    id: "asia_south_america",
  },
  {
    type: "conquer_continents",
    continents: ["north_america", "africa"],
    id: "north_america_africa",
  },
  {
    type: "conquer_continents",
    continents: ["north_america", "australia"],
    id: "north_america_australia",
  },
  {
    type: "conquer_continents",
    continents: ["europe", "australia"],
    plusAny: 1,
    id: "europe_australia_any",
  },
  {
    type: "conquer_continents",
    continents: ["europe", "south_america"],
    plusAny: 1,
    id: "europe_south_america_any",
  },
];

export const TERRITORY_MISSIONS: Mission[] = [
  { type: "capture_territories", count: 24, id: "capture_24" },
  {
    type: "capture_territories",
    count: 18,
    minArmiesEach: 2,
    id: "capture_18_two_each",
  },
];

/** The 24-territory fallback shared by every eliminate-color mission. */
export const ELIMINATE_FALLBACK: Mission = {
  type: "capture_territories",
  count: 24,
  id: "capture_24",
};

export const eliminateColorMission = (color: PlayerColor): Mission => ({
  type: "eliminate_color",
  targetColor: color,
  fallback: ELIMINATE_FALLBACK,
  id: `eliminate_${color}`,
});

/** All non-eliminate missions (used to seed the setup mission picker). */
export const STANDARD_MISSIONS: Mission[] = [
  ...CONTINENT_MISSIONS,
  ...TERRITORY_MISSIONS,
];
