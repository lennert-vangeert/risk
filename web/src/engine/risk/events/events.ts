import { type TerritoryId } from "../board/territories";
import { type Card } from "../cards/deck";
import { type Mission, type SuspectedMission } from "../missions/types";
import { type PlayerId } from "../state/ids";

/**
 * Every state transition goofball can narrate. Narrated dice results are INPUTS
 * (validated, never generated) so the engine stays deterministic. The reducer
 * (`apply`) is the only thing that consumes these.
 */
export type GameEvent =
  // --- setup ---
  | { type: "ClaimTerritory"; playerId: PlayerId; territory: TerritoryId }
  | {
      type: "PlaceStartingArmies";
      playerId: PlayerId;
      placements: Partial<Record<TerritoryId, number>>;
    }
  // --- reinforce ---
  | {
      type: "TradeInSet";
      playerId: PlayerId;
      /** For goofball: the exact cards. For opponents: omit (only counts known). */
      cards?: [Card, Card, Card];
      matchTerritory?: TerritoryId;
    }
  | {
      type: "PlaceArmies";
      playerId: PlayerId;
      placements: Partial<Record<TerritoryId, number>>;
    }
  // --- attack (narrated dice = input) ---
  | {
      type: "Attack";
      playerId: PlayerId;
      from: TerritoryId;
      to: TerritoryId;
      attackerDice: 1 | 2 | 3;
      defenderDice: 1 | 2;
      attackerLosses: number;
      defenderLosses: number;
      conquered: boolean;
      /** Armies moved into the conquered territory (>= attackerDice). */
      movedIn?: number;
    }
  // --- fortify ---
  | {
      type: "Fortify";
      playerId: PlayerId;
      from: TerritoryId;
      to: TerritoryId;
      count: number;
    }
  // --- cards / lifecycle ---
  | { type: "DrawCard"; playerId: PlayerId; card?: Card }
  | {
      type: "EliminatePlayer";
      playerId: PlayerId; // the eliminated player
      byPlayerId: PlayerId;
      cardsTransferred: number;
      /** When goofball is the eliminator, the actual cards captured (known IRL). */
      receivedCards?: Card[];
    }
  | { type: "AdvancePhase" }
  | { type: "DeclareWinner"; playerId: PlayerId }
  // --- corrections / advisor inputs ---
  | {
      type: "EditTerritory";
      territory: TerritoryId;
      ownerId?: PlayerId | null;
      armies?: number;
    }
  | { type: "SetOpponentCardCount"; playerId: PlayerId; count: number }
  | { type: "SetGoofballMission"; mission: Mission }
  | {
      type: "LogSuspectedMission";
      playerId: PlayerId;
      suspected: SuspectedMission;
    }
  | { type: "ReshuffleDeck" };

export type GameEventType = GameEvent["type"];
