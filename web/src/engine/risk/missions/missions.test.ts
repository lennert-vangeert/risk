import { describe, it, expect } from "vitest";
import { CONTINENTS } from "../board/continents";
import { TERRITORY_IDS } from "../board/territories";
import { createInitialGame } from "../state/factory";
import { type GameState } from "../state/state";
import { isComplete, progress, eliminateColorMission } from "./missions";
import { type Mission } from "./types";

const game = (): GameState =>
  createInitialGame({
    players: [
      { id: "p0", name: "Me", color: "red", turnOrder: 0, isGoofball: true },
      { id: "p1", name: "A", color: "blue", turnOrder: 1, isGoofball: false },
      { id: "p2", name: "B", color: "green", turnOrder: 2, isGoofball: false },
    ],
    winCondition: "secret_mission",
  });

const own = (s: GameState, playerId: string, ts: readonly string[], armies = 1) => {
  for (const t of ts) {
    (s.territories as Record<string, { ownerId: string; armies: number }>)[t] = {
      ownerId: playerId,
      armies,
    };
  }
};

describe("conquer_continents", () => {
  const mission: Mission = {
    type: "conquer_continents",
    continents: ["australia", "south_america"],
    id: "au_sa",
  };

  it("complete only when both continents are fully held", () => {
    const s = game();
    own(s, "p0", CONTINENTS.australia.territories);
    expect(isComplete(s, "p0", mission)).toBe(false);
    own(s, "p0", CONTINENTS.south_america.territories);
    expect(isComplete(s, "p0", mission)).toBe(true);
  });

  it("progress reflects continents held", () => {
    const s = game();
    own(s, "p0", CONTINENTS.australia.territories);
    expect(progress(s, "p0", mission).ratio).toBeCloseTo(0.5, 5);
  });

  it("plusAny requires an extra continent", () => {
    const m: Mission = {
      type: "conquer_continents",
      continents: ["australia", "south_america"],
      plusAny: 1,
      id: "au_sa_any",
    };
    const s = game();
    own(s, "p0", [
      ...CONTINENTS.australia.territories,
      ...CONTINENTS.south_america.territories,
    ]);
    expect(isComplete(s, "p0", m)).toBe(false);
    own(s, "p0", CONTINENTS.africa.territories);
    expect(isComplete(s, "p0", m)).toBe(true);
  });
});

describe("capture_territories", () => {
  it("counts territories, optionally requiring min armies each", () => {
    const s = game();
    own(s, "p0", TERRITORY_IDS.slice(0, 24), 1);
    expect(isComplete(s, "p0", { type: "capture_territories", count: 24, id: "c24" })).toBe(true);
    expect(
      isComplete(s, "p0", {
        type: "capture_territories",
        count: 24,
        minArmiesEach: 2,
        id: "c24_2",
      })
    ).toBe(false);
    own(s, "p0", TERRITORY_IDS.slice(0, 24), 2);
    expect(
      isComplete(s, "p0", {
        type: "capture_territories",
        count: 24,
        minArmiesEach: 2,
        id: "c24_2",
      })
    ).toBe(true);
  });
});

describe("eliminate_color", () => {
  it("is complete when the mission holder eliminated the target", () => {
    const s = game();
    const m = eliminateColorMission("blue"); // p1
    expect(isComplete(s, "p0", m)).toBe(false);
    s.players[1].eliminated = true;
    s.players[1].eliminatedBy = "p0";
    expect(isComplete(s, "p0", m)).toBe(true);
  });

  it("falls back to 24 territories when the target is eliminated by someone else", () => {
    const s = game();
    const m = eliminateColorMission("blue");
    s.players[1].eliminated = true;
    s.players[1].eliminatedBy = "p2"; // not the mission holder
    expect(isComplete(s, "p0", m)).toBe(false);
    own(s, "p0", TERRITORY_IDS.slice(0, 24));
    expect(isComplete(s, "p0", m)).toBe(true); // via fallback
  });

  it("falls back when the target color is the mission holder", () => {
    const s = game();
    const m = eliminateColorMission("red"); // p0 is red / goofball
    own(s, "p0", TERRITORY_IDS.slice(0, 24));
    expect(isComplete(s, "p0", m)).toBe(true);
  });
});
