import { useCallback, useEffect, useRef, useState } from "react";
import { notifications } from "@mantine/notifications";
import { apply, replay, type GameEvent, type GameState } from "@engine/risk";
import {
  subscribeGame,
  patchGame,
  type GameWithId,
  type GamePatch,
} from "@services/games";

const statusOf = (state: GameState): GamePatch["status"] => {
  if (state.turn.phase === "game_over") return "finished";
  if (state.turn.phase === "setup_claim" || state.turn.phase === "setup_deploy")
    return "setup";
  return "active";
};

const turnSnapshot = (state: GameState) => ({
  status: statusOf(state),
  currentPlayerId: state.turn.currentPlayerId,
  currentPhase: state.turn.phase,
  winnerId: state.winnerId,
  turnNumber: state.turn.turnNumber,
});

export type UseGame = {
  game: GameWithId | null;
  state: GameState | undefined;
  loading: boolean;
  dispatch: (event: GameEvent) => Promise<void>;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  canUndo: boolean;
  canRedo: boolean;
};

/**
 * Subscribe to a game document and expose a client-side reducer. `dispatch`
 * runs the pure engine locally, optimistically updates, then persists — the
 * realtime echo is dropped via a monotonic `rev` guard so there's no write
 * loop. Undo/redo are pure event-log replays.
 */
export const useGame = (id: string): UseGame => {
  const [game, setGame] = useState<GameWithId | null>(null);
  const [loading, setLoading] = useState(true);
  const lastRev = useRef<number>(-1);
  const gameRef = useRef<GameWithId | null>(null);

  useEffect(() => {
    lastRev.current = -1;
    gameRef.current = null;
    setGame(null);
    setLoading(true);
    const unsubscribe = subscribeGame(id, (next) => {
      // Ignore stale echoes (including our own optimistic write coming back).
      if (next && next.rev < lastRev.current) {
        setLoading(false);
        return;
      }
      if (next) lastRev.current = next.rev;
      gameRef.current = next;
      setGame(next);
      setLoading(false);
    });
    return unsubscribe;
  }, [id]);

  const commit = useCallback(
    async (
      nextState: GameState,
      events: GameEvent[],
      redoStack: GameEvent[]
    ): Promise<void> => {
      const current = gameRef.current;
      if (!current) return;
      const rev = current.rev + 1;
      const snapshot = turnSnapshot(nextState);
      const optimistic: GameWithId = {
        ...current,
        ...snapshot,
        events,
        redoStack,
        cachedState: nextState,
        rev,
      };
      lastRev.current = rev;
      gameRef.current = optimistic;
      setGame(optimistic);
      try {
        await patchGame(id, {
          events,
          redoStack,
          cachedState: nextState,
          rev,
          ...snapshot,
        });
      } catch {
        notifications.show({ color: "red", message: "Couldn't save that move." });
      }
    },
    [id]
  );

  const dispatch = useCallback(
    async (event: GameEvent): Promise<void> => {
      const current = gameRef.current;
      if (!current) return;
      const result = apply(current.cachedState, event);
      if (!result.ok) {
        notifications.show({ color: "red", message: result.error });
        return;
      }
      await commit(result.state, [...current.events, event], []);
    },
    [commit]
  );

  const undo = useCallback(async (): Promise<void> => {
    const current = gameRef.current;
    if (!current || current.events.length === 0) return;
    const events = current.events.slice(0, -1);
    const undone = current.events[current.events.length - 1];
    const nextState = replay(current.initialState, events);
    await commit(nextState, events, [undone, ...current.redoStack]);
  }, [commit]);

  const redo = useCallback(async (): Promise<void> => {
    const current = gameRef.current;
    if (!current || current.redoStack.length === 0) return;
    const [next, ...rest] = current.redoStack;
    const events = [...current.events, next];
    const nextState = replay(current.initialState, events);
    await commit(nextState, events, rest);
  }, [commit]);

  return {
    game,
    state: game?.cachedState,
    loading,
    dispatch,
    undo,
    redo,
    canUndo: !!game && game.events.length > 0,
    canRedo: !!game && game.redoStack.length > 0,
  };
};
