import { describe, it, expect } from "vitest";
import { TERRITORY_IDS, type TerritoryId } from "../board/territories";
import { CONTINENTS } from "../board/continents";
import { createInitialGame } from "../state/factory";
import { type GameState } from "../state/state";
import { type Mission } from "../missions/types";
import { type Phase } from "../state/ids";
import { advise } from "./advisor";

const board = (
  winCondition: "world_domination" | "secret_mission",
  phase: Phase,
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
    phase,
    turnNumber: 3,
    conqueredThisTurn: false,
    reinforcementsRemaining: phase === "reinforce" ? 5 : 0,
  };
  s.setupArmiesRemaining = {};
  return s;
};

const set = (s: GameState, t: TerritoryId, owner: string, armies: number) => {
  s.territories[t] = { ownerId: owner, armies };
};

const firstOfKind = (s: GameState, kind: string) =>
  advise(s).recommendations.find((r) => r.kind === kind);

describe("placement", () => {
  it("reinforces the threatened border, not a safe interior", () => {
    const s = board("world_domination", "reinforce");
    for (const t of CONTINENTS.australia.territories) set(s, t, "p0", 1);
    set(s, "siam", "p1", 10); // big stack pressing indonesia
    const top = advise(s).recommendations[0];
    expect(top.kind).toBe("place");
    if (top.kind === "place") expect(top.territory).toBe("indonesia");
  });
});

describe("attack", () => {
  it("picks the continent-completing edge and secures a card", () => {
    const s = board("world_domination", "attack");
    set(s, "indonesia", "p0", 1);
    set(s, "new_guinea", "p0", 5);
    set(s, "western_australia", "p0", 1);
    set(s, "eastern_australia", "p1", 1); // the last piece of Australia
    const top = advise(s).recommendations[0];
    expect(top.kind).toBe("attack");
    if (top.kind === "attack") {
      expect(top.from).toBe("new_guinea");
      expect(top.to).toBe("eastern_australia");
    }
  });

  it("always offers a stop option", () => {
    const s = board("world_domination", "attack");
    set(s, "indonesia", "p0", 3);
    set(s, "siam", "p1", 1);
    expect(advise(s).recommendations.some((r) => r.kind === "stop")).toBe(true);
  });
});

describe("fortify", () => {
  it("moves surplus from a safe interior to the front", () => {
    const s = board("world_domination", "fortify");
    for (const t of CONTINENTS.australia.territories) set(s, t, "p0", 1);
    set(s, "new_guinea", "p0", 5); // interior surplus
    set(s, "siam", "p1", 3); // threatens indonesia (the front)
    const top = firstOfKind(s, "fortify");
    expect(top).toBeDefined();
    if (top && top.kind === "fortify") {
      expect(top.from).toBe("new_guinea");
      expect(top.to).toBe("indonesia");
      expect(top.count).toBe(4);
    }
  });
});

describe("determinism", () => {
  it("returns identical advice for the same state", () => {
    const s = board("world_domination", "reinforce");
    for (const t of CONTINENTS.australia.territories) set(s, t, "p0", 1);
    set(s, "siam", "p1", 8);
    expect(advise(s)).toEqual(advise(s));
  });
});

describe("mission vs domination reweighting", () => {
  const scenario = (
    winCondition: "world_domination" | "secret_mission",
    mission: Mission | null
  ): GameState => {
    const s = board(winCondition, "reinforce", mission);
    s.turn.reinforcementsRemaining = 3;
    set(s, "indonesia", "p0", 1); // Australia border, pressed by siam
    set(s, "siam", "p1", 3);
    set(s, "northern_europe", "p0", 1); // Europe (mission target)
    return s;
  };

  it("domination reinforces the most-threatened border", () => {
    const top = advise(scenario("world_domination", null)).recommendations[0];
    expect(top.kind).toBe("place");
    if (top.kind === "place") expect(top.territory).toBe("indonesia");
  });

  it("mission mode reinforces the mission path instead", () => {
    const mission: Mission = {
      type: "conquer_continents",
      continents: ["europe"],
      id: "europe",
    };
    const top = advise(scenario("secret_mission", mission)).recommendations[0];
    expect(top.kind).toBe("place");
    if (top.kind === "place") expect(top.territory).toBe("northern_europe");
  });
});
