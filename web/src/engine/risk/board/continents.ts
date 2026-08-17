import { TERRITORY_IDS, type TerritoryId } from "./territories";

/**
 * The 6 continents and their reinforcement bonuses (classic Risk values).
 * A player controlling every territory of a continent collects its `bonus`
 * armies each turn on top of the base territory count.
 */
export const CONTINENT_IDS = [
  "north_america",
  "south_america",
  "europe",
  "africa",
  "asia",
  "australia",
] as const;

export type ContinentId = (typeof CONTINENT_IDS)[number];

export type ContinentDef = {
  bonus: number;
  territories: TerritoryId[];
};

export const CONTINENTS: Record<ContinentId, ContinentDef> = {
  north_america: {
    bonus: 5,
    territories: [
      "alaska",
      "northwest_territory",
      "greenland",
      "alberta",
      "ontario",
      "quebec",
      "western_us",
      "eastern_us",
      "central_america",
    ],
  },
  south_america: {
    bonus: 2,
    territories: ["venezuela", "peru", "brazil", "argentina"],
  },
  europe: {
    bonus: 5,
    territories: [
      "iceland",
      "great_britain",
      "scandinavia",
      "northern_europe",
      "western_europe",
      "southern_europe",
      "ukraine",
    ],
  },
  africa: {
    bonus: 3,
    territories: [
      "north_africa",
      "egypt",
      "east_africa",
      "congo",
      "south_africa",
      "madagascar",
    ],
  },
  asia: {
    bonus: 7,
    territories: [
      "ural",
      "siberia",
      "yakutsk",
      "kamchatka",
      "irkutsk",
      "mongolia",
      "japan",
      "afghanistan",
      "china",
      "middle_east",
      "india",
      "siam",
    ],
  },
  australia: {
    bonus: 2,
    territories: [
      "indonesia",
      "new_guinea",
      "western_australia",
      "eastern_australia",
    ],
  },
};

/**
 * Reverse lookup TerritoryId -> ContinentId, built once at module load.
 * Typed as a full Record so callers never handle `undefined`.
 */
export const CONTINENT_OF: Record<TerritoryId, ContinentId> = (() => {
  const map = {} as Record<TerritoryId, ContinentId>;
  for (const continent of CONTINENT_IDS) {
    for (const territory of CONTINENTS[continent].territories) {
      map[territory] = continent;
    }
  }
  // Guard against a territory missing from every continent list.
  for (const territory of TERRITORY_IDS) {
    if (map[territory] === undefined) {
      throw new Error(`Territory ${territory} is not assigned to a continent`);
    }
  }
  return map;
})();
