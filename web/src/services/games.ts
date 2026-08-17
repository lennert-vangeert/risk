import {
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { gamesCol, type Game } from "@data/games";
import type {
  GameEvent,
  GameState,
  PlayerId,
  WinCondition,
} from "@engine/risk";

export type GameWithId = Game & { id: string };

export type NewGame = {
  name: string;
  playerCount: number;
  winCondition: WinCondition;
  initialState: GameState;
};

/** The fields a mutation rewrites; `updatedAt` is stamped by the service. */
export type GamePatch = {
  events: GameEvent[];
  redoStack: GameEvent[];
  cachedState: GameState;
  rev: number;
  status: Game["status"];
  currentPlayerId: PlayerId | null;
  currentPhase: string;
  winnerId: PlayerId | null;
  turnNumber: number;
};

/** Live list of the current user's games, most-recently-updated first. */
export const subscribeGames = (
  uid: string,
  cb: (games: GameWithId[]) => void
): Unsubscribe => {
  const q = query(
    gamesCol(),
    where("ownerId", "==", uid),
    orderBy("updatedAt", "desc")
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
};

/** Live single game document (null if missing / not readable). */
export const subscribeGame = (
  id: string,
  cb: (game: GameWithId | null) => void
): Unsubscribe =>
  onSnapshot(doc(gamesCol(), id), (snap) =>
    cb(snap.exists() ? { id: snap.id, ...snap.data() } : null)
  );

export const createGame = async (
  ownerId: string,
  g: NewGame
): Promise<string> => {
  const ref = await addDoc(gamesCol(), {
    ownerId,
    schemaVersion: g.initialState.schemaVersion,
    rev: 0,
    name: g.name,
    status: "setup",
    playerCount: g.playerCount,
    winCondition: g.winCondition,
    currentPlayerId: g.initialState.turn.currentPlayerId,
    currentPhase: g.initialState.turn.phase,
    winnerId: g.initialState.winnerId,
    turnNumber: g.initialState.turn.turnNumber,
    initialState: g.initialState,
    events: [],
    redoStack: [],
    cachedState: g.initialState,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
};

/** Apply one mutation (append event / undo / redo): rewrites the payload + turn snapshot. */
export const patchGame = async (
  id: string,
  patch: GamePatch
): Promise<void> => {
  await updateDoc(doc(gamesCol(), id), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
};

export const deleteGame = async (id: string): Promise<void> => {
  await deleteDoc(doc(gamesCol(), id));
};
