import { areAdjacent, isTerritoryId } from "../board/index";
import { isValidSet } from "../cards/deck";
import { type GameState } from "../state/state";
import { type GameEvent } from "../events/events";
import { getPlayer, handContainsAll, placementEntries, sumPlacements } from "./helpers";
import { connectedThroughOwn } from "./phase";

/**
 * Legality check for an event against the current state. Returns an error
 * message (safe to surface to the user) or null when the event is applicable.
 * The reducer runs this first, and the UI reuses it to disable illegal actions.
 */
export const canApply = (state: GameState, event: GameEvent): string | null => {
  if (state.winnerId && event.type !== "EditTerritory") {
    return "The game is already over.";
  }
  const { phase, currentPlayerId } = state.turn;

  switch (event.type) {
    case "ClaimTerritory": {
      if (phase !== "setup_claim") return "Not in the claim phase.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      if (!isTerritoryId(event.territory)) return "Unknown territory.";
      if (state.territories[event.territory].ownerId !== null)
        return "That territory is already claimed.";
      if ((state.setupArmiesRemaining[event.playerId] ?? 0) < 1)
        return "No starting armies left to place.";
      return null;
    }

    case "PlaceStartingArmies": {
      if (phase !== "setup_deploy") return "Not in the deployment phase.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      const total = sumPlacements(event.placements);
      if (total < 1) return "Place at least one army.";
      if (total > (state.setupArmiesRemaining[event.playerId] ?? 0))
        return "Not enough starting armies.";
      for (const [t] of placementEntries(event.placements)) {
        if (state.territories[t].ownerId !== event.playerId)
          return `You don't own ${t}.`;
      }
      return null;
    }

    case "TradeInSet": {
      if (phase !== "reinforce") return "Sets can only be traded during reinforcement.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      const player = getPlayer(state, event.playerId);
      if (!player) return "Unknown player.";
      if (player.cardCount < 3) return "Not enough cards for a set.";
      if (event.cards) {
        if (!player.isGoofball) return "Only your own card identities are known.";
        if (!isValidSet(event.cards)) return "Those cards aren't a valid set.";
        if (!handContainsAll(state.cards.goofballHand, event.cards))
          return "You don't hold all of those cards.";
      } else if (player.isGoofball) {
        return "Specify which cards you're trading in.";
      }
      return null;
    }

    case "PlaceArmies": {
      if (phase !== "reinforce") return "Not in the reinforcement phase.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      const total = sumPlacements(event.placements);
      if (total < 1) return "Place at least one army.";
      if (total > state.turn.reinforcementsRemaining)
        return "Not enough reinforcements.";
      for (const [t] of placementEntries(event.placements)) {
        if (state.territories[t].ownerId !== event.playerId)
          return `You don't own ${t}.`;
      }
      return null;
    }

    case "Attack": {
      if (phase !== "attack") return "Not in the attack phase.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      const from = state.territories[event.from];
      const to = state.territories[event.to];
      if (from.ownerId !== event.playerId)
        return "You don't own the attacking territory.";
      if (to.ownerId === event.playerId) return "You can't attack your own territory.";
      if (to.ownerId === null) return "The target has no owner.";
      if (!areAdjacent(event.from, event.to)) return "Those territories aren't adjacent.";
      if (from.armies < 2) return "You need at least 2 armies to attack.";
      const maxAtk = Math.min(3, from.armies - 1);
      const maxDef = Math.min(2, to.armies);
      if (event.attackerDice < 1 || event.attackerDice > maxAtk)
        return "Invalid attacker dice count.";
      if (event.defenderDice < 1 || event.defenderDice > maxDef)
        return "Invalid defender dice count.";
      const pairs = Math.min(event.attackerDice, event.defenderDice);
      if (event.attackerLosses < 0 || event.defenderLosses < 0)
        return "Losses can't be negative.";
      if (event.attackerLosses + event.defenderLosses !== pairs)
        return "Total losses must equal the number of dice compared.";
      if (event.defenderLosses > to.armies)
        return "The defender can't lose more armies than it has.";
      if (event.attackerLosses > from.armies - 1)
        return "The attacker must keep at least one army behind.";
      const conquered = to.armies - event.defenderLosses <= 0;
      if (conquered !== event.conquered)
        return "The conquered flag doesn't match the dice result.";
      if (conquered) {
        const maxMove = from.armies - event.attackerLosses - 1;
        const movedIn = event.movedIn ?? event.attackerDice;
        if (movedIn < event.attackerDice)
          return "Move in at least as many armies as attacking dice.";
        if (movedIn > maxMove) return "Can't move in that many armies.";
      }
      return null;
    }

    case "Fortify": {
      if (phase !== "fortify") return "Not in the fortify phase.";
      if (event.playerId !== currentPlayerId) return "It's not this player's turn.";
      const from = state.territories[event.from];
      const to = state.territories[event.to];
      if (from.ownerId !== event.playerId || to.ownerId !== event.playerId)
        return "You must own both territories.";
      if (event.from === event.to) return "Pick two different territories.";
      if (event.count < 1) return "Move at least one army.";
      if (from.armies - event.count < 1)
        return "You must leave at least one army behind.";
      const reachable =
        state.config.fortifyMode === "adjacent"
          ? areAdjacent(event.from, event.to)
          : connectedThroughOwn(state, event.playerId, event.from, event.to);
      if (!reachable) return "Those territories aren't connected through your own.";
      return null;
    }

    case "DrawCard": {
      const player = getPlayer(state, event.playerId);
      if (!player) return "Unknown player.";
      if (player.isGoofball && !event.card)
        return "Specify which card you drew.";
      if (!player.isGoofball && event.card)
        return "Opponent card identities aren't known.";
      return null;
    }

    case "EliminatePlayer": {
      const victim = getPlayer(state, event.playerId);
      const by = getPlayer(state, event.byPlayerId);
      if (!victim || !by) return "Unknown player.";
      if (victim.eliminated) return "That player is already eliminated.";
      if (event.cardsTransferred < 0) return "Card count can't be negative.";
      if (by.isGoofball && event.receivedCards &&
          event.receivedCards.length !== event.cardsTransferred)
        return "Received-card count doesn't match.";
      return null;
    }

    case "AdvancePhase": {
      if (phase === "reinforce") {
        if (state.turn.reinforcementsRemaining !== 0)
          return "Place all your reinforcements first.";
        return null;
      }
      if (phase === "attack" || phase === "fortify") return null;
      return "You can't advance from here.";
    }

    case "DeclareWinner": {
      const player = getPlayer(state, event.playerId);
      if (!player) return "Unknown player.";
      if (player.eliminated) return "An eliminated player can't win.";
      return null;
    }

    case "EditTerritory": {
      if (!isTerritoryId(event.territory)) return "Unknown territory.";
      if (event.armies !== undefined && event.armies < 0)
        return "Armies can't be negative.";
      if (
        event.ownerId !== undefined &&
        event.ownerId !== null &&
        !getPlayer(state, event.ownerId)
      )
        return "Unknown owner.";
      return null;
    }

    case "SetOpponentCardCount": {
      const player = getPlayer(state, event.playerId);
      if (!player) return "Unknown player.";
      if (player.isGoofball) return "Your own hand is tracked exactly.";
      if (event.count < 0) return "Card count can't be negative.";
      return null;
    }

    case "SetGoofballMission":
      return null;

    case "LogSuspectedMission": {
      if (!getPlayer(state, event.playerId)) return "Unknown player.";
      return null;
    }

    case "ReshuffleDeck":
      return null;
  }
};
