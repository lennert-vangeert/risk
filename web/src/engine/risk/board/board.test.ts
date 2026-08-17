import { describe, it, expect } from "vitest";
import { TERRITORY_IDS, isTerritoryId, type TerritoryId } from "./territories";
import { CONTINENT_IDS, CONTINENTS, CONTINENT_OF } from "./continents";
import { ADJACENCY } from "./adjacency";
import { CONTINENT_BORDERS, areAdjacent, neighborsOf } from "./index";

describe("territories", () => {
  it("has exactly 42 unique ids", () => {
    expect(TERRITORY_IDS.length).toBe(42);
    expect(new Set(TERRITORY_IDS).size).toBe(42);
  });

  it("isTerritoryId guards runtime strings", () => {
    expect(isTerritoryId("alaska")).toBe(true);
    expect(isTerritoryId("atlantis")).toBe(false);
    expect(isTerritoryId(42)).toBe(false);
  });
});

describe("continents", () => {
  it("partition the 42 territories exactly (no gaps, no overlaps)", () => {
    const all = CONTINENT_IDS.flatMap((c) => CONTINENTS[c].territories);
    expect(all.length).toBe(42);
    expect(new Set(all)).toEqual(new Set(TERRITORY_IDS));
  });

  it("has the classic bonus values", () => {
    expect(CONTINENTS.north_america.bonus).toBe(5);
    expect(CONTINENTS.south_america.bonus).toBe(2);
    expect(CONTINENTS.europe.bonus).toBe(5);
    expect(CONTINENTS.africa.bonus).toBe(3);
    expect(CONTINENTS.asia.bonus).toBe(7);
    expect(CONTINENTS.australia.bonus).toBe(2);
  });

  it("maps every territory to its continent", () => {
    for (const t of TERRITORY_IDS) {
      expect(CONTINENTS[CONTINENT_OF[t]].territories).toContain(t);
    }
  });
});

describe("adjacency graph", () => {
  it("has an entry for every territory", () => {
    for (const t of TERRITORY_IDS) {
      expect(ADJACENCY[t]).toBeDefined();
      expect(ADJACENCY[t].length).toBeGreaterThan(0);
    }
  });

  it("only references valid territory ids", () => {
    for (const t of TERRITORY_IDS) {
      for (const n of ADJACENCY[t]) {
        expect(isTerritoryId(n)).toBe(true);
      }
    }
  });

  it("has no self-loops", () => {
    for (const t of TERRITORY_IDS) {
      expect(ADJACENCY[t]).not.toContain(t);
    }
  });

  it("has no duplicate neighbours", () => {
    for (const t of TERRITORY_IDS) {
      expect(new Set(ADJACENCY[t]).size).toBe(ADJACENCY[t].length);
    }
  });

  it("is symmetric: if a->b then b->a", () => {
    const asymmetries: string[] = [];
    for (const a of TERRITORY_IDS) {
      for (const b of ADJACENCY[a]) {
        if (!ADJACENCY[b as TerritoryId].includes(a)) {
          asymmetries.push(`${a} -> ${b} but not ${b} -> ${a}`);
        }
      }
    }
    expect(asymmetries).toEqual([]);
  });

  it("is a single connected component", () => {
    const seen = new Set<TerritoryId>();
    const stack: TerritoryId[] = [TERRITORY_IDS[0]];
    while (stack.length) {
      const cur = stack.pop()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      for (const n of neighborsOf(cur)) stack.push(n);
    }
    expect(seen.size).toBe(42);
  });

  it("encodes the known sea routes", () => {
    expect(areAdjacent("alaska", "kamchatka")).toBe(true);
    expect(areAdjacent("greenland", "iceland")).toBe(true);
    expect(areAdjacent("brazil", "north_africa")).toBe(true);
    expect(areAdjacent("western_europe", "north_africa")).toBe(true);
    expect(areAdjacent("southern_europe", "egypt")).toBe(true);
    expect(areAdjacent("kamchatka", "japan")).toBe(true);
    expect(areAdjacent("siam", "indonesia")).toBe(true);
    expect(areAdjacent("central_america", "venezuela")).toBe(true);
  });
});

describe("derived continent borders", () => {
  it("gives Australia a single choke (indonesia)", () => {
    expect(CONTINENT_BORDERS.australia).toEqual(["indonesia"]);
  });

  it("gives North America three borders", () => {
    expect(new Set(CONTINENT_BORDERS.north_america)).toEqual(
      new Set(["alaska", "greenland", "central_america"])
    );
  });

  it("gives South America two borders (venezuela, brazil)", () => {
    expect(new Set(CONTINENT_BORDERS.south_america)).toEqual(
      new Set(["venezuela", "brazil"])
    );
  });
});
