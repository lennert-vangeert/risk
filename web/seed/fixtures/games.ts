import {
  DEFAULT_CARD_SYMBOL_BY_TERRITORY,
  TERRITORY_IDS,
  createInitialGame,
  neighborsOf,
  reinforcementCount,
  type Card,
  type GameState,
  type NewPlayerInput,
  type TerritoryId,
} from "../../src/engine/risk";

const PLAYERS: NewPlayerInput[] = [
  { id: "p0", name: "You", color: "red", turnOrder: 0, isGoofball: true },
  { id: "p1", name: "Ada", color: "blue", turnOrder: 1, isGoofball: false },
  { id: "p2", name: "Grace", color: "green", turnOrder: 2, isGoofball: false },
  { id: "p3", name: "Alan", color: "yellow", turnOrder: 3, isGoofball: false },
];

/**
 * A scrambled mid-game. Each player has a recognisable home, but borders have
 * been fought over — so most continents are broken and only a couple of bonuses
 * are still held:
 *   p0 (you)  — North America (whole, +5), a Venezuela toehold, and a lone
 *               Kamchatka salient deep in Asia.
 *   p1 (Ada)  — South America remnant + most of Africa.
 *   p2 (Grace)— Europe (minus Ukraine) pushing into Africa & western Asia.
 *   p3 (Alan) — the Asian bulk + all of Australia (+2), plus grabbed Ukraine.
 */
const OWNER: Record<TerritoryId, string> = {
  // North America — you hold it whole
  alaska: "p0",
  northwest_territory: "p0",
  greenland: "p0",
  alberta: "p0",
  ontario: "p0",
  quebec: "p0",
  western_us: "p0",
  eastern_us: "p0",
  central_america: "p0",
  // South America — you pushed into Venezuela; Ada holds the rest
  venezuela: "p0",
  peru: "p1",
  brazil: "p1",
  argentina: "p1",
  // Europe — Grace's, but Alan took Ukraine
  iceland: "p2",
  great_britain: "p2",
  scandinavia: "p2",
  northern_europe: "p2",
  western_europe: "p2",
  southern_europe: "p2",
  ukraine: "p3",
  // Africa — Ada's, but Grace holds Egypt
  north_africa: "p1",
  egypt: "p2",
  east_africa: "p1",
  congo: "p1",
  south_africa: "p1",
  madagascar: "p1",
  // Asia — mostly Alan's; Grace pushed into the west, you hold Kamchatka
  ural: "p2",
  siberia: "p3",
  yakutsk: "p3",
  kamchatka: "p0",
  irkutsk: "p3",
  mongolia: "p3",
  japan: "p3",
  afghanistan: "p2",
  china: "p3",
  middle_east: "p2",
  india: "p3",
  siam: "p3",
  // Australia — all Alan's
  indonesia: "p3",
  new_guinea: "p3",
  western_australia: "p3",
  eastern_australia: "p3",
};

/**
 * Logical garrisons: thin in the interior, heavier the more enemy neighbours a
 * territory has (contested frontiers and salients bristle with armies).
 */
const armiesFor = (t: TerritoryId): number => {
  const enemyAdj = neighborsOf(t).filter((n) => OWNER[n] !== OWNER[t]).length;
  return enemyAdj === 0 ? 1 : Math.min(6, 2 + enemyAdj);
};

const card = (territory: TerritoryId): Card => ({
  kind: "territory",
  territory,
  symbol: DEFAULT_CARD_SYMBOL_BY_TERRITORY[territory],
});

/** Build the demo game state: your reinforcement turn, mid-game. */
export const buildSeededGame = (): GameState => {
  const state = createInitialGame({
    players: PLAYERS,
    winCondition: "world_domination",
  });

  for (const t of TERRITORY_IDS) {
    state.territories[t] = { ownerId: OWNER[t], armies: armiesFor(t) };
  }

  // Mid-game: your turn, reinforcement phase.
  state.setupArmiesRemaining = {};
  state.turn = {
    currentPlayerId: "p0",
    phase: "reinforce",
    turnNumber: 6,
    conqueredThisTurn: false,
    reinforcementsRemaining: 0,
  };
  state.turn.reinforcementsRemaining = reinforcementCount(state, "p0");

  // You hold a ready-to-trade set of North American cards (all owned → +2 match).
  state.cards.goofballHand = [card("alaska"), card("ontario"), card("quebec")];
  state.cards.deck.unknownDiscardCount = 9; // opponents have cashed three sets
  state.setsTradedIn = 3;

  const cardCounts: Record<string, number> = { p0: 3, p1: 2, p2: 1, p3: 3 };
  for (const p of state.players) p.cardCount = cardCounts[p.id];

  return state;
};
