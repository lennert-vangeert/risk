import { type TerritoryId } from "../board/territories";
import {
  type Card,
  type CardSymbol,
  type DeckComposition,
} from "../cards/deck";
import { type Mission, type SuspectedMission } from "../missions/types";
import {
  type PlayerId,
  type PlayerColor,
  type Phase,
  type WinCondition,
} from "./ids";

export const SCHEMA_VERSION = 1;

export type Player = {
  id: PlayerId;
  name: string;
  color: PlayerColor;
  /** 0-based seat order. */
  turnOrder: number;
  /** Exactly one player is goofball (the advisee). */
  isGoofball: boolean;
  eliminated: boolean;
  /** Who eliminated this player (drives the eliminate-color mission fallback). */
  eliminatedBy: PlayerId | null;
  /**
   * Authoritative card count. For opponents this is all we know; for goofball
   * it is kept equal to `cards.goofballHand.length`.
   */
  cardCount: number;
};

export type TerritoryState = {
  ownerId: PlayerId | null;
  armies: number;
};

export type DeckState = {
  /** The full deck composition (constant per ruleset). */
  composition: DeckComposition;
  /** Known-identity cards in the discard pile (goofball's witnessed trade-ins). */
  discard: Card[];
  /** Discarded cards of unknown identity (opponents' trade-ins). */
  unknownDiscardCount: number;
  /** Bumped when the draw pile is exhausted and the discard is reshuffled in. */
  reshuffleCount: number;
};

export type FortifyMode = "connected" | "adjacent";

export type RulesetConfig = {
  winCondition: WinCondition;
  /** Escalating trade-in schedule, e.g. [4,6,8,10,12,15] then +5 each. */
  setSchedule: number[];
  /** Bonus armies for a card matching an owned territory (classic +2). */
  territoryMatchBonus: number;
  deckComposition: DeckComposition;
  /** Starting armies keyed by player count, e.g. {3:35,4:30,5:25,6:20}. */
  startingArmiesByPlayerCount: Record<number, number>;
  cardSymbolByTerritory: Record<TerritoryId, CardSymbol>;
  /** Whether fortify moves along any connected friendly path or only adjacent. */
  fortifyMode: FortifyMode;
};

export type TurnState = {
  currentPlayerId: PlayerId | null;
  phase: Phase;
  /** 1-based; increments each time play returns to the first seat. */
  turnNumber: number;
  /** Whether the current player has conquered at least one territory this turn. */
  conqueredThisTurn: boolean;
  /** Armies still to place this reinforcement phase. */
  reinforcementsRemaining: number;
};

/**
 * The complete, serialisable game state. Every field is a plain
 * scalar/array/map — no class instances, no `undefined`, no Firestore SDK
 * types — so it round-trips through Firestore and reconstructs identically.
 */
export type GameState = {
  schemaVersion: number;
  config: RulesetConfig;
  players: Player[];
  territories: Record<TerritoryId, TerritoryState>;
  cards: {
    /** goofball's exact hand. */
    goofballHand: Card[];
    deck: DeckState;
  };
  /** GLOBAL count of sets traded worldwide — drives escalation. */
  setsTradedIn: number;
  turn: TurnState;
  /** Armies each player still has to place during setup (empty once setup ends). */
  setupArmiesRemaining: Record<PlayerId, number>;
  missions: {
    /** goofball's own (known) mission. */
    goofball: Mission | null;
    /** Suspected opponent missions goofball has logged. */
    suspected: Record<PlayerId, SuspectedMission[]>;
  };
  winnerId: PlayerId | null;
};
