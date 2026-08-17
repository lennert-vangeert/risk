import { type TerritoryId } from "../board/territories";
import { type Card } from "../cards/deck";
import { type GameState, type Player } from "../state/state";
import { type PlayerId } from "../state/ids";

export const getPlayer = (
  state: GameState,
  id: PlayerId
): Player | undefined => state.players.find((p) => p.id === id);

/** Positive placement entries from a partial territory->count map. */
export const placementEntries = (
  placements: Partial<Record<TerritoryId, number>>
): [TerritoryId, number][] =>
  (Object.entries(placements) as [TerritoryId, number | undefined][])
    .filter(([, n]) => typeof n === "number" && n > 0)
    .map(([t, n]) => [t, n as number]);

export const sumPlacements = (
  placements: Partial<Record<TerritoryId, number>>
): number => placementEntries(placements).reduce((s, [, n]) => s + n, 0);

/** Structural equality of two cards (territory cards are unique by territory). */
export const sameCard = (a: Card, b: Card): boolean => {
  if (a.kind === "wild" && b.kind === "wild") return a.id === b.id;
  if (a.kind === "territory" && b.kind === "territory") {
    return a.territory === b.territory && a.symbol === b.symbol;
  }
  return false;
};

/** Whether every card of `set` is present in `hand`. */
export const handContainsAll = (hand: Card[], set: Card[]): boolean => {
  const remaining = [...hand];
  for (const card of set) {
    const idx = remaining.findIndex((h) => sameCard(h, card));
    if (idx < 0) return false;
    remaining.splice(idx, 1);
  }
  return true;
};
