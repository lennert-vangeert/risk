import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import { neighborsOf } from "../board/index";
import { type GameState, type Player } from "../state/state";
import { type PlayerId } from "../state/ids";

/** How many territories a player currently owns. */
export const ownedCount = (state: GameState, playerId: PlayerId): number =>
  TERRITORY_IDS.reduce(
    (n, t) => (state.territories[t].ownerId === playerId ? n + 1 : n),
    0
  );

/** Non-eliminated players, in seat order. */
export const activePlayers = (state: GameState): Player[] =>
  state.players.filter((p) => !p.eliminated).sort((a, b) => a.turnOrder - b.turnOrder);

/** Whether every territory has an owner (setup claim complete). */
export const allTerritoriesClaimed = (state: GameState): boolean =>
  TERRITORY_IDS.every((t) => state.territories[t].ownerId !== null);

/**
 * Whether `to` is reachable from `from` through a chain of territories all
 * owned by `playerId` (used for connected-path fortify). Assumes both endpoints
 * are owned by the player.
 */
export const connectedThroughOwn = (
  state: GameState,
  playerId: PlayerId,
  from: TerritoryId,
  to: TerritoryId
): boolean => {
  if (from === to) return true;
  const seen = new Set<TerritoryId>([from]);
  const stack: TerritoryId[] = [from];
  while (stack.length) {
    const cur = stack.pop()!;
    for (const n of neighborsOf(cur)) {
      if (state.territories[n].ownerId !== playerId) continue;
      if (n === to) return true;
      if (!seen.has(n)) {
        seen.add(n);
        stack.push(n);
      }
    }
  }
  return false;
};
