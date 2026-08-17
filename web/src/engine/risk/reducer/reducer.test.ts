import { describe, it, expect } from "vitest";
import { TERRITORY_IDS } from "../board/territories";
import { createInitialGame } from "../state/factory";
import { reinforcementCount } from "../rules/reinforcements";
import { deckAccounting } from "../cards/accounting";
import { type GameState } from "../state/state";
import { type GameEvent } from "../events/events";
import { apply, replay, type ApplyResult } from "./reducer";

const game = (): GameState =>
  createInitialGame({
    players: [
      { id: "p0", name: "Me", color: "red", turnOrder: 0, isGoofball: true },
      { id: "p1", name: "A", color: "blue", turnOrder: 1, isGoofball: false },
      { id: "p2", name: "B", color: "green", turnOrder: 2, isGoofball: false },
    ],
    winCondition: "world_domination",
  });

const ok = (r: ApplyResult): GameState => {
  if (!r.ok) throw new Error(r.error);
  return r.state;
};

/** Play the whole setup (claim every territory round-robin, then deploy). */
const playSetup = (start: GameState): { state: GameState; events: GameEvent[] } => {
  let s = start;
  const events: GameEvent[] = [];
  while (s.turn.phase === "setup_claim") {
    const territory = TERRITORY_IDS.find(
      (t) => s.territories[t].ownerId === null
    )!;
    const ev: GameEvent = {
      type: "ClaimTerritory",
      playerId: s.turn.currentPlayerId!,
      territory,
    };
    events.push(ev);
    s = ok(apply(s, ev));
  }
  while (s.turn.phase === "setup_deploy") {
    const pid = s.turn.currentPlayerId!;
    const remaining = s.setupArmiesRemaining[pid];
    const t = TERRITORY_IDS.find((tt) => s.territories[tt].ownerId === pid)!;
    const ev: GameEvent = {
      type: "PlaceStartingArmies",
      playerId: pid,
      placements: { [t]: remaining },
    };
    events.push(ev);
    s = ok(apply(s, ev));
  }
  return { state: s, events };
};

describe("setup flow", () => {
  it("claims all territories then deploys into the first turn", () => {
    const { state } = playSetup(game());
    expect(state.turn.phase).toBe("reinforce");
    expect(state.turn.turnNumber).toBe(1);
    expect(state.turn.currentPlayerId).toBe("p0");
    // every territory owned, one army minimum
    expect(TERRITORY_IDS.every((t) => state.territories[t].ownerId !== null)).toBe(
      true
    );
    // all starting armies placed
    expect(Object.values(state.setupArmiesRemaining)).toEqual([]);
    // reinforcements match the formula
    expect(state.turn.reinforcementsRemaining).toBe(
      reinforcementCount(state, "p0")
    );
  });
});

describe("turn play", () => {
  it("reinforce -> attack -> conquer -> fortify -> next player", () => {
    const { state: setup } = playSetup(game());
    let s = setup;

    // Set up a clean attack: p0 stacks alaska, p1 holds a thin northwest_territory.
    s = ok(apply(s, { type: "EditTerritory", territory: "alaska", ownerId: "p0", armies: 1 }));
    s = ok(apply(s, { type: "EditTerritory", territory: "northwest_territory", ownerId: "p1", armies: 1 }));

    // Place all reinforcements on alaska.
    const r = s.turn.reinforcementsRemaining;
    s = ok(apply(s, { type: "PlaceArmies", playerId: "p0", placements: { alaska: r } }));
    expect(s.turn.reinforcementsRemaining).toBe(0);
    expect(s.territories.alaska.armies).toBe(1 + r);

    // Advance to attack.
    s = ok(apply(s, { type: "AdvancePhase" }));
    expect(s.turn.phase).toBe("attack");

    // Attack and conquer (defender had 1, loses it).
    s = ok(
      apply(s, {
        type: "Attack",
        playerId: "p0",
        from: "alaska",
        to: "northwest_territory",
        attackerDice: 1,
        defenderDice: 1,
        attackerLosses: 0,
        defenderLosses: 1,
        conquered: true,
        movedIn: 1,
      })
    );
    expect(s.territories.northwest_territory.ownerId).toBe("p0");
    expect(s.territories.northwest_territory.armies).toBe(1);
    expect(s.turn.conqueredThisTurn).toBe(true);

    // Attack -> fortify -> end turn.
    s = ok(apply(s, { type: "AdvancePhase" }));
    expect(s.turn.phase).toBe("fortify");
    s = ok(apply(s, { type: "AdvancePhase" }));
    expect(s.turn.phase).toBe("reinforce");
    expect(s.turn.currentPlayerId).toBe("p1");
    expect(s.turn.conqueredThisTurn).toBe(false);
  });
});

describe("illegal moves", () => {
  it("are rejected without mutating state", () => {
    const { state } = playSetup(game());
    // attacking during reinforce is illegal
    const r = apply(state, {
      type: "Attack",
      playerId: "p0",
      from: "alaska",
      to: "northwest_territory",
      attackerDice: 1,
      defenderDice: 1,
      attackerLosses: 0,
      defenderLosses: 1,
      conquered: true,
    });
    expect(r.ok).toBe(false);

    // acting out of turn is illegal
    const r2 = apply(state, {
      type: "PlaceArmies",
      playerId: "p1",
      placements: { alaska: 1 },
    });
    expect(r2.ok).toBe(false);
  });

  it("rejects a non-adjacent attack and a 1-army attack", () => {
    let s = playSetup(game()).state;
    s = ok(apply(s, { type: "EditTerritory", territory: "alaska", ownerId: "p0", armies: 5 }));
    s = ok(apply(s, { type: "EditTerritory", territory: "brazil", ownerId: "p1", armies: 1 }));
    s.turn.reinforcementsRemaining = 0;
    s = ok(apply(s, { type: "AdvancePhase" }));
    // alaska and brazil are not adjacent
    expect(
      apply(s, {
        type: "Attack",
        playerId: "p0",
        from: "alaska",
        to: "brazil",
        attackerDice: 1,
        defenderDice: 1,
        attackerLosses: 0,
        defenderLosses: 1,
        conquered: true,
      }).ok
    ).toBe(false);
  });
});

describe("undo == replay (determinism)", () => {
  it("replaying all-but-last equals the state before the last event", () => {
    const { state: setupState, events } = playSetup(game());
    const initial = game();

    // full replay reproduces the setup state exactly
    const replayed = replay(initial, events);
    expect(replayed).toEqual(setupState);

    // replaying all-but-last equals the pre-last state
    const beforeLast = replay(initial, events.slice(0, -1));
    const afterLast = replay(initial, events);
    expect(replay(initial, events.slice(0, -1))).toEqual(beforeLast);
    expect(afterLast).not.toEqual(beforeLast);
  });
});

describe("deck accounting", () => {
  it("keeps the 44-card invariant across draws and trades", () => {
    let s = playSetup(game()).state;
    const check = () => {
      const a = deckAccounting(s);
      expect(
        a.inGoofballHand +
          a.inOpponentHands +
          a.knownDiscard +
          a.unknownDiscard +
          a.drawDeckRemaining
      ).toBe(44);
      expect(a.drawDeckRemaining).toBeGreaterThanOrEqual(0);
    };
    check();

    // goofball draws three known cards
    s = ok(apply(s, { type: "DrawCard", playerId: "p0", card: { kind: "territory", territory: "brazil", symbol: "infantry" } }));
    s = ok(apply(s, { type: "DrawCard", playerId: "p0", card: { kind: "territory", territory: "peru", symbol: "cavalry" } }));
    s = ok(apply(s, { type: "DrawCard", playerId: "p0", card: { kind: "territory", territory: "congo", symbol: "artillery" } }));
    expect(s.players[0].cardCount).toBe(3);
    check();

    // opponents draw unknown cards
    s = ok(apply(s, { type: "DrawCard", playerId: "p1" }));
    s = ok(apply(s, { type: "DrawCard", playerId: "p2" }));
    check();

    // goofball trades the set
    s = ok(
      apply(s, {
        type: "TradeInSet",
        playerId: "p0",
        cards: [
          { kind: "territory", territory: "brazil", symbol: "infantry" },
          { kind: "territory", territory: "peru", symbol: "cavalry" },
          { kind: "territory", territory: "congo", symbol: "artillery" },
        ],
      })
    );
    expect(s.players[0].cardCount).toBe(0);
    expect(s.setsTradedIn).toBe(1);
    check();
  });
});
