import {
  collection,
  Timestamp,
  type CollectionReference,
} from "firebase/firestore";
import { db } from "@global/firebase/config";
import { converter } from "./_shared";
import type {
  GameEvent,
  GameState,
  PlayerId,
  WinCondition,
} from "@engine/risk";

/**
 * A saved Risk game. Event-sourced: `initialState + events` is the source of
 * truth and `cachedState = events.reduce(apply, initialState)` is a denormalised
 * cache for fast reads. Top-level scalars power list views, queries and rules.
 *
 * Portable fields (no Firestore SDK types) live in `GameData` so the Admin-SDK
 * seed can reuse the shape; only `createdAt`/`updatedAt` are SDK-stamped.
 */
export type GameData = {
  ownerId: string; // uid -> users/{uid} (owner-private)
  schemaVersion: number;
  /** Monotonic write counter — defeats snapshot echo and guards stale writes. */
  rev: number;
  name: string;
  status: "setup" | "active" | "finished";
  playerCount: number;
  winCondition: WinCondition;
  // denormalised turn snapshot (kept in sync on every write)
  currentPlayerId: PlayerId | null;
  currentPhase: string;
  winnerId: PlayerId | null;
  turnNumber: number;
  // event-sourced payload (opaque blobs to the rules)
  initialState: GameState;
  events: GameEvent[];
  redoStack: GameEvent[];
  cachedState: GameState;
};

export type Game = GameData & {
  createdAt: Timestamp;
  updatedAt: Timestamp;
};

const gameConverter = converter<Game>();

export const gamesCol = (): CollectionReference<Game> =>
  collection(db, "games").withConverter(gameConverter);
