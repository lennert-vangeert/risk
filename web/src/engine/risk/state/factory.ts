import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import {
  DEFAULT_DECK_COMPOSITION,
  DEFAULT_CARD_SYMBOL_BY_TERRITORY,
} from "../cards/deck";
import { DEFAULT_STARTING_ARMIES, startingArmiesFor } from "../rules/setup";
import { type Mission } from "../missions/types";
import {
  SCHEMA_VERSION,
  type GameState,
  type Player,
  type RulesetConfig,
  type TerritoryState,
} from "./state";
import {
  type PlayerColor,
  type PlayerId,
  type WinCondition,
} from "./ids";

/** Ruleset defaults (classic escalating Risk). `winCondition` is chosen per game. */
export const DEFAULT_CONFIG: Omit<RulesetConfig, "winCondition"> = {
  setSchedule: [4, 6, 8, 10, 12, 15],
  territoryMatchBonus: 2,
  deckComposition: DEFAULT_DECK_COMPOSITION,
  startingArmiesByPlayerCount: DEFAULT_STARTING_ARMIES,
  cardSymbolByTerritory: DEFAULT_CARD_SYMBOL_BY_TERRITORY,
  fortifyMode: "connected",
};

export type NewPlayerInput = {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  turnOrder: number;
  isGoofball: boolean;
};

export type NewGameInput = {
  players: NewPlayerInput[];
  winCondition: WinCondition;
  goofballMission?: Mission | null;
  configOverrides?: Partial<Omit<RulesetConfig, "winCondition">>;
};

const emptyTerritories = (): Record<TerritoryId, TerritoryState> => {
  const territories = {} as Record<TerritoryId, TerritoryState>;
  for (const t of TERRITORY_IDS) territories[t] = { ownerId: null, armies: 0 };
  return territories;
};

/**
 * Build a fresh game in the `setup_claim` phase: no territories owned yet, each
 * player holding their full pool of starting armies to place. The turn order is
 * taken from each player's `turnOrder`; seat 0 acts first.
 */
export const createInitialGame = (input: NewGameInput): GameState => {
  const config: RulesetConfig = {
    ...DEFAULT_CONFIG,
    ...input.configOverrides,
    winCondition: input.winCondition,
  };

  const players: Player[] = [...input.players]
    .sort((a, b) => a.turnOrder - b.turnOrder)
    .map((p) => ({
      id: p.id,
      name: p.name,
      color: p.color,
      turnOrder: p.turnOrder,
      isGoofball: p.isGoofball,
      eliminated: false,
      eliminatedBy: null,
      cardCount: 0,
    }));

  const startingArmies = startingArmiesFor(
    players.length,
    config.startingArmiesByPlayerCount
  );

  const setupArmiesRemaining: Record<PlayerId, number> = {};
  for (const p of players) setupArmiesRemaining[p.id] = startingArmies;

  const first = players.find((p) => p.turnOrder === 0) ?? players[0];

  return {
    schemaVersion: SCHEMA_VERSION,
    config,
    players,
    territories: emptyTerritories(),
    cards: {
      goofballHand: [],
      deck: {
        composition: config.deckComposition,
        discard: [],
        unknownDiscardCount: 0,
        reshuffleCount: 0,
      },
    },
    setsTradedIn: 0,
    turn: {
      currentPlayerId: first ? first.id : null,
      phase: "setup_claim",
      turnNumber: 1,
      conqueredThisTurn: false,
      reinforcementsRemaining: 0,
    },
    setupArmiesRemaining,
    missions: {
      goofball: input.goofballMission ?? null,
      suspected: {},
    },
    winnerId: null,
  };
};
