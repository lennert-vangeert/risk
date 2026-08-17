import { describe, it, expect } from "vitest";
import { CONTINENTS } from "../board/continents";
import { setValue } from "../cards/deck";
import { createInitialGame } from "../state/factory";
import { type GameState } from "../state/state";
import {
  baseReinforcements,
  continentBonus,
  controlledContinents,
  reinforcementCount,
  mustTrade,
} from "./reinforcements";

const threePlayerGame = (): GameState =>
  createInitialGame({
    players: [
      { id: "p0", name: "Me", color: "red", turnOrder: 0, isGoofball: true },
      { id: "p1", name: "A", color: "blue", turnOrder: 1, isGoofball: false },
      { id: "p2", name: "B", color: "green", turnOrder: 2, isGoofball: false },
    ],
    winCondition: "world_domination",
  });

const own = (state: GameState, playerId: string, ts: string[]): void => {
  for (const t of ts) {
    (state.territories as Record<string, { ownerId: string; armies: number }>)[
      t
    ] = { ownerId: playerId, armies: 1 };
  }
};

describe("baseReinforcements", () => {
  it("is floor(owned/3) with a floor of 3", () => {
    expect(baseReinforcements(1)).toBe(3);
    expect(baseReinforcements(8)).toBe(3);
    expect(baseReinforcements(9)).toBe(3);
    expect(baseReinforcements(11)).toBe(3);
    expect(baseReinforcements(12)).toBe(4);
    expect(baseReinforcements(14)).toBe(4);
    expect(baseReinforcements(15)).toBe(5);
    expect(baseReinforcements(42)).toBe(14);
  });
});

describe("continent control", () => {
  it("detects a fully owned continent and its bonus", () => {
    const s = threePlayerGame();
    own(s, "p0", [...CONTINENTS.australia.territories]);
    expect(controlledContinents(s, "p0")).toContain("australia");
    expect(continentBonus(s, "p0")).toBe(2);
  });

  it("does not credit a partially owned continent", () => {
    const s = threePlayerGame();
    own(s, "p0", CONTINENTS.australia.territories.slice(0, 3));
    expect(controlledContinents(s, "p0")).not.toContain("australia");
    expect(continentBonus(s, "p0")).toBe(0);
  });
});

describe("reinforcementCount", () => {
  it("combines base, continent, trade value and territory match", () => {
    const s = threePlayerGame();
    // Own all of Australia (4) plus 8 others = 12 territories.
    own(s, "p0", [
      ...CONTINENTS.australia.territories,
      "siam",
      "india",
      "china",
      "mongolia",
      "japan",
      "ural",
      "siberia",
      "irkutsk",
    ]);
    // 12 territories -> base 4, Australia bonus 2.
    expect(reinforcementCount(s, "p0")).toBe(6);
    expect(reinforcementCount(s, "p0", { tradeValue: 10 })).toBe(16);
    expect(
      reinforcementCount(s, "p0", { tradeValue: 10, territoryMatch: true })
    ).toBe(18);
  });
});

describe("setValue escalation", () => {
  it("follows 4,6,8,10,12,15 then +5", () => {
    const schedule = [4, 6, 8, 10, 12, 15];
    expect(schedule.map((_, i) => setValue(i, schedule))).toEqual([
      4, 6, 8, 10, 12, 15,
    ]);
    expect(setValue(6, schedule)).toBe(20);
    expect(setValue(7, schedule)).toBe(25);
    expect(setValue(10, schedule)).toBe(40);
  });
});

describe("mustTrade", () => {
  it("forces at 5 cards at turn start, 6 after elimination", () => {
    expect(mustTrade(4, "start_of_turn")).toBe(false);
    expect(mustTrade(5, "start_of_turn")).toBe(true);
    expect(mustTrade(5, "after_elimination")).toBe(false);
    expect(mustTrade(6, "after_elimination")).toBe(true);
  });
});
