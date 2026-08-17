import { countBySymbol, type DeckComposition } from "./deck";
import { type GameState } from "../state/state";

export type DeckAccounting = {
  /** Total cards in the deck (44 for classic). */
  total: number;
  inGoofballHand: number;
  inOpponentHands: number;
  knownDiscard: number;
  unknownDiscard: number;
  /** Cards still in the draw pile (derived; never negative in a valid state). */
  drawDeckRemaining: number;
  /**
   * Symbol composition of everything goofball hasn't seen — the draw deck plus
   * opponents' hands. This is the pool future unknown draws resolve from.
   */
  unseenComposition: DeckComposition;
};

const sumComposition = (c: DeckComposition): number =>
  c.infantry + c.cavalry + c.artillery + c.wild;

const subtractComposition = (
  a: DeckComposition,
  b: DeckComposition
): DeckComposition => ({
  infantry: a.infantry - b.infantry,
  cavalry: a.cavalry - b.cavalry,
  artillery: a.artillery - b.artillery,
  wild: a.wild - b.wild,
});

export const deckAccounting = (state: GameState): DeckAccounting => {
  const { composition, discard, unknownDiscardCount } = state.cards.deck;
  const total = sumComposition(composition);
  const inGoofballHand = state.cards.goofballHand.length;
  const inOpponentHands = state.players
    .filter((p) => !p.isGoofball)
    .reduce((sum, p) => sum + p.cardCount, 0);
  const knownDiscard = discard.length;
  const unknownDiscard = unknownDiscardCount;
  const drawDeckRemaining =
    total - inGoofballHand - inOpponentHands - knownDiscard - unknownDiscard;

  const seen = {
    infantry: 0,
    cavalry: 0,
    artillery: 0,
    wild: 0,
  } as DeckComposition;
  const hand = countBySymbol(state.cards.goofballHand);
  const disc = countBySymbol(discard);
  seen.infantry = hand.infantry + disc.infantry;
  seen.cavalry = hand.cavalry + disc.cavalry;
  seen.artillery = hand.artillery + disc.artillery;
  seen.wild = hand.wild + disc.wild;

  return {
    total,
    inGoofballHand,
    inOpponentHands,
    knownDiscard,
    unknownDiscard,
    drawDeckRemaining,
    unseenComposition: subtractComposition(composition, seen),
  };
};
