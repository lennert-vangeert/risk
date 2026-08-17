import { setValue, type Card } from "../cards/deck";
import { isComplete } from "../missions/missions";
import { reinforcementCount } from "../rules/reinforcements";
import { type GameState } from "../state/state";
import { type PlayerId } from "../state/ids";
import { type GameEvent } from "../events/events";
import { canApply } from "./validate";
import { getPlayer, placementEntries, sameCard } from "./helpers";
import {
  activePlayers,
  allTerritoriesClaimed,
  ownedCount,
} from "./phase";

export type ApplyResult =
  | { ok: true; state: GameState }
  | { ok: false; error: string };

const clone = (state: GameState): GameState => structuredClone(state);

// --- internal transition helpers (mutate a draft) ---

const enterReinforce = (s: GameState, playerId: PlayerId): void => {
  s.turn.currentPlayerId = playerId;
  s.turn.phase = "reinforce";
  s.turn.conqueredThisTurn = false;
  s.turn.reinforcementsRemaining = reinforcementCount(s, playerId);
};

const startFirstTurn = (s: GameState): void => {
  const first = activePlayers(s)[0];
  s.turn.turnNumber = 1;
  s.setupArmiesRemaining = {};
  enterReinforce(s, first.id);
};

const nextDeployer = (s: GameState, fromId: PlayerId): PlayerId => {
  const order = activePlayers(s);
  const idx = order.findIndex((p) => p.id === fromId);
  for (let i = 1; i <= order.length; i++) {
    const p = order[(idx + i) % order.length];
    if ((s.setupArmiesRemaining[p.id] ?? 0) > 0) return p.id;
  }
  return fromId;
};

const checkWin = (s: GameState): void => {
  if (s.winnerId) return;
  const active = s.players.filter((p) => !p.eliminated);
  if (active.length === 1) {
    s.winnerId = active[0].id;
    s.turn.phase = "game_over";
    return;
  }
  for (const p of active) {
    if (ownedCount(s, p.id) === 42) {
      s.winnerId = p.id;
      s.turn.phase = "game_over";
      return;
    }
  }
  if (s.config.winCondition === "secret_mission" && s.missions.goofball) {
    const goof = s.players.find((p) => p.isGoofball);
    if (goof && !goof.eliminated && isComplete(s, goof.id, s.missions.goofball)) {
      s.winnerId = goof.id;
      s.turn.phase = "game_over";
    }
  }
};

const advanceTurn = (s: GameState): void => {
  const active = activePlayers(s);
  if (active.length <= 1) {
    checkWin(s);
    return;
  }
  const curIdx = active.findIndex((p) => p.id === s.turn.currentPlayerId);
  const nextIdx = (curIdx + 1) % active.length;
  if (nextIdx === 0) s.turn.turnNumber += 1;
  enterReinforce(s, active[nextIdx].id);
};

const removeCardsFromHand = (s: GameState, cards: Card[]): void => {
  for (const card of cards) {
    const idx = s.cards.goofballHand.findIndex((h) => sameCard(h, card));
    if (idx >= 0) s.cards.goofballHand.splice(idx, 1);
  }
};

// --- effect application (assumes the event has already passed canApply) ---

const applyEffect = (s: GameState, event: GameEvent): void => {
  switch (event.type) {
    case "ClaimTerritory": {
      s.territories[event.territory] = { ownerId: event.playerId, armies: 1 };
      s.setupArmiesRemaining[event.playerId] -= 1;
      if (allTerritoriesClaimed(s)) {
        const withArmies = activePlayers(s).filter(
          (p) => (s.setupArmiesRemaining[p.id] ?? 0) > 0
        );
        if (withArmies.length === 0) {
          startFirstTurn(s);
        } else {
          s.turn.phase = "setup_deploy";
          s.turn.currentPlayerId = withArmies[0].id;
        }
      } else {
        const active = activePlayers(s);
        const idx = active.findIndex((p) => p.id === event.playerId);
        s.turn.currentPlayerId = active[(idx + 1) % active.length].id;
      }
      return;
    }

    case "PlaceStartingArmies": {
      let total = 0;
      for (const [t, n] of placementEntries(event.placements)) {
        s.territories[t].armies += n;
        total += n;
      }
      s.setupArmiesRemaining[event.playerId] -= total;
      const remaining = activePlayers(s).filter(
        (p) => (s.setupArmiesRemaining[p.id] ?? 0) > 0
      );
      if (remaining.length === 0) startFirstTurn(s);
      else s.turn.currentPlayerId = nextDeployer(s, event.playerId);
      return;
    }

    case "TradeInSet": {
      const player = getPlayer(s, event.playerId)!;
      const value = setValue(s.setsTradedIn, s.config.setSchedule);
      s.setsTradedIn += 1;
      if (event.cards && player.isGoofball) {
        removeCardsFromHand(s, event.cards);
        s.cards.deck.discard.push(...event.cards);
        player.cardCount = s.cards.goofballHand.length;
      } else {
        player.cardCount -= 3;
        s.cards.deck.unknownDiscardCount += 3;
      }
      s.turn.reinforcementsRemaining += value;
      if (
        event.matchTerritory &&
        s.territories[event.matchTerritory].ownerId === event.playerId
      ) {
        s.territories[event.matchTerritory].armies +=
          s.config.territoryMatchBonus;
      }
      return;
    }

    case "PlaceArmies": {
      let total = 0;
      for (const [t, n] of placementEntries(event.placements)) {
        s.territories[t].armies += n;
        total += n;
      }
      s.turn.reinforcementsRemaining -= total;
      return;
    }

    case "Attack": {
      const from = s.territories[event.from];
      const to = s.territories[event.to];
      from.armies -= event.attackerLosses;
      to.armies -= event.defenderLosses;
      if (event.conquered) {
        const movedIn = event.movedIn ?? event.attackerDice;
        from.armies -= movedIn;
        to.armies = movedIn;
        to.ownerId = event.playerId;
        s.turn.conqueredThisTurn = true;
      }
      checkWin(s);
      return;
    }

    case "Fortify": {
      s.territories[event.from].armies -= event.count;
      s.territories[event.to].armies += event.count;
      return;
    }

    case "DrawCard": {
      const player = getPlayer(s, event.playerId)!;
      if (event.card && player.isGoofball) {
        s.cards.goofballHand.push(event.card);
        player.cardCount = s.cards.goofballHand.length;
      } else {
        player.cardCount += 1;
      }
      return;
    }

    case "EliminatePlayer": {
      const victim = getPlayer(s, event.playerId)!;
      const by = getPlayer(s, event.byPlayerId)!;
      victim.eliminated = true;
      victim.eliminatedBy = event.byPlayerId;
      victim.cardCount = 0;
      if (by.isGoofball && event.receivedCards) {
        s.cards.goofballHand.push(...event.receivedCards);
        by.cardCount = s.cards.goofballHand.length;
      } else {
        by.cardCount += event.cardsTransferred;
      }
      checkWin(s);
      return;
    }

    case "AdvancePhase": {
      switch (s.turn.phase) {
        case "reinforce":
          s.turn.phase = "attack";
          break;
        case "attack":
          s.turn.phase = "fortify";
          break;
        case "fortify":
          advanceTurn(s);
          break;
        case "setup_claim":
        case "setup_deploy":
        case "game_over":
          break;
      }
      return;
    }

    case "DeclareWinner": {
      s.winnerId = event.playerId;
      s.turn.phase = "game_over";
      return;
    }

    case "EditTerritory": {
      const ts = s.territories[event.territory];
      if (event.ownerId !== undefined) ts.ownerId = event.ownerId;
      if (event.armies !== undefined) ts.armies = event.armies;
      checkWin(s);
      return;
    }

    case "SetOpponentCardCount": {
      const player = getPlayer(s, event.playerId)!;
      player.cardCount = event.count;
      return;
    }

    case "SetGoofballMission": {
      s.missions.goofball = event.mission;
      return;
    }

    case "LogSuspectedMission": {
      const list = s.missions.suspected[event.playerId] ?? [];
      list.push(event.suspected);
      s.missions.suspected[event.playerId] = list;
      return;
    }

    case "ReshuffleDeck": {
      s.cards.deck.discard = [];
      s.cards.deck.unknownDiscardCount = 0;
      s.cards.deck.reshuffleCount += 1;
      return;
    }
  }
};

/**
 * The pure, total game reducer. Validates the event, and on success returns a
 * brand-new state; on failure returns the reason without mutating anything.
 * Never throws.
 */
export const apply = (state: GameState, event: GameEvent): ApplyResult => {
  const error = canApply(state, event);
  if (error) return { ok: false, error };
  const next = clone(state);
  applyEffect(next, event);
  return { ok: true, state: next };
};

/**
 * Fold a sequence of events over an initial state. Because `apply` is pure and
 * deterministic this is exactly how undo (replay all-but-last) is implemented.
 * Throws if an event is illegal — callers replay known-good logs.
 */
export const replay = (
  initialState: GameState,
  events: GameEvent[]
): GameState => {
  let state = initialState;
  for (const event of events) {
    const result = apply(state, event);
    if (!result.ok) {
      throw new Error(`replay: illegal ${event.type}: ${result.error}`);
    }
    state = result.state;
  }
  return state;
};

export { canApply } from "./validate";
