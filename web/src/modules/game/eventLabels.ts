import type { GameEvent, GameState, PlayerId } from "@engine/risk";

const nice = (id: string): string => id.replace(/_/g, " ");

const playerName = (state: GameState, id: PlayerId | null): string =>
  state.players.find((p) => p.id === id)?.name ?? "?";

/** A compact i18n key + params describing an event for the history log. */
export const describeEvent = (
  state: GameState,
  event: GameEvent
): { key: string; params: Record<string, string | number> } => {
  switch (event.type) {
    case "ClaimTerritory":
      return { key: "events.claim", params: { player: playerName(state, event.playerId), territory: nice(event.territory) } };
    case "PlaceStartingArmies":
      return { key: "events.deploy", params: { player: playerName(state, event.playerId) } };
    case "TradeInSet":
      return { key: "events.trade", params: { player: playerName(state, event.playerId) } };
    case "PlaceArmies":
      return { key: "events.place", params: { player: playerName(state, event.playerId) } };
    case "Attack":
      return {
        key: event.conquered ? "events.attackConquer" : "events.attack",
        params: { from: nice(event.from), to: nice(event.to) },
      };
    case "Fortify":
      return { key: "events.fortify", params: { from: nice(event.from), to: nice(event.to), count: event.count } };
    case "DrawCard":
      return { key: "events.draw", params: { player: playerName(state, event.playerId) } };
    case "EliminatePlayer":
      return { key: "events.eliminate", params: { player: playerName(state, event.playerId), by: playerName(state, event.byPlayerId) } };
    case "AdvancePhase":
      return { key: "events.advance", params: {} };
    case "DeclareWinner":
      return { key: "events.winner", params: { player: playerName(state, event.playerId) } };
    case "EditTerritory":
      return { key: "events.edit", params: { territory: nice(event.territory) } };
    case "SetOpponentCardCount":
      return { key: "events.setCount", params: { player: playerName(state, event.playerId), count: event.count } };
    case "SetGoofballMission":
      return { key: "events.setMission", params: {} };
    case "LogSuspectedMission":
      return { key: "events.suspect", params: { player: playerName(state, event.playerId) } };
    case "ReshuffleDeck":
      return { key: "events.reshuffle", params: {} };
  }
};
