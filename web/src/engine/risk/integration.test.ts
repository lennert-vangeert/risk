import { describe, it, expect } from "vitest";
import { TERRITORY_IDS, type TerritoryId } from "./board/territories";
import { createInitialGame } from "./state/factory";
import { apply } from "./reducer/reducer";
import { type GameState } from "./state/state";
import { type Mission } from "./missions/types";
import { type WinCondition } from "./state/ids";

const active = (
  winCondition: WinCondition,
  mission: Mission | null = null
): GameState => {
  const s = createInitialGame({
    players: [
      { id: "p0", name: "Me", color: "red", turnOrder: 0, isGoofball: true },
      { id: "p1", name: "A", color: "blue", turnOrder: 1, isGoofball: false },
      { id: "p2", name: "B", color: "green", turnOrder: 2, isGoofball: false },
    ],
    winCondition,
    goofballMission: mission,
  });
  for (const t of TERRITORY_IDS) s.territories[t] = { ownerId: "p1", armies: 1 };
  s.turn = {
    currentPlayerId: "p0",
    phase: "attack",
    turnNumber: 5,
    conqueredThisTurn: false,
    reinforcementsRemaining: 0,
  };
  s.setupArmiesRemaining = {};
  return s;
};

const own = (s: GameState, playerId: string, ts: TerritoryId[], armies = 1) => {
  for (const t of ts) s.territories[t] = { ownerId: playerId, armies };
};

describe("domination win", () => {
  it("declares the winner when a player takes the last territory", () => {
    const s = active("world_domination");
    // p0 owns everything except alaska; a big stack sits next door.
    own(s, "p0", [...TERRITORY_IDS]);
    s.territories.alaska = { ownerId: "p1", armies: 1 };
    s.territories.northwest_territory = { ownerId: "p0", armies: 5 };

    const r = apply(s, {
      type: "Attack",
      playerId: "p0",
      from: "northwest_territory",
      to: "alaska",
      attackerDice: 1,
      defenderDice: 1,
      attackerLosses: 0,
      defenderLosses: 1,
      conquered: true,
      movedIn: 1,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.winnerId).toBe("p0");
      expect(r.state.turn.phase).toBe("game_over");
    }
  });
});

describe("elimination", () => {
  it("records the eliminator and hands goofball the captured cards", () => {
    const s = active("world_domination");
    // p1 has been reduced to zero territories; goofball did it.
    own(s, "p0", TERRITORY_IDS.slice(0, 41));
    own(s, "p2", [TERRITORY_IDS[41]]);
    s.players[1].cardCount = 2;

    const r = apply(s, {
      type: "EliminatePlayer",
      playerId: "p1",
      byPlayerId: "p0",
      cardsTransferred: 2,
      receivedCards: [
        { kind: "territory", territory: "brazil", symbol: "infantry" },
        { kind: "wild", id: "wild1" },
      ],
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      const p1 = r.state.players[1];
      expect(p1.eliminated).toBe(true);
      expect(p1.eliminatedBy).toBe("p0");
      expect(p1.cardCount).toBe(0);
      expect(r.state.players[0].cardCount).toBe(2);
      expect(r.state.cards.goofballHand).toHaveLength(2);
    }
  });
});

describe("secret mission win", () => {
  it("declares goofball the winner when the mission completes", () => {
    const mission: Mission = {
      type: "capture_territories",
      count: 24,
      id: "capture_24",
    };
    const s = active("secret_mission", mission);
    // 23 owned; the correction that gives the 24th should trigger the win.
    own(s, "p0", TERRITORY_IDS.slice(0, 23));

    const r = apply(s, {
      type: "EditTerritory",
      territory: TERRITORY_IDS[23],
      ownerId: "p0",
      armies: 3,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.state.winnerId).toBe("p0");
      expect(r.state.turn.phase).toBe("game_over");
    }
  });
});
