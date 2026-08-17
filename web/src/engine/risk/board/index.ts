import { TERRITORY_IDS, type TerritoryId } from "./territories";
import {
  CONTINENT_IDS,
  CONTINENTS,
  CONTINENT_OF,
  type ContinentId,
} from "./continents";
import { ADJACENCY } from "./adjacency";

export {
  TERRITORY_IDS,
  TERRITORY_COUNT,
  isTerritoryId,
  type TerritoryId,
} from "./territories";
export {
  CONTINENT_IDS,
  CONTINENTS,
  CONTINENT_OF,
  type ContinentId,
  type ContinentDef,
} from "./continents";
export { ADJACENCY } from "./adjacency";

/** The continent a territory belongs to. */
export const continentOf = (t: TerritoryId): ContinentId => CONTINENT_OF[t];

/** Neighbours of a territory (land + sea, undirected). */
export const neighborsOf = (t: TerritoryId): readonly TerritoryId[] =>
  ADJACENCY[t];

/** Whether two territories share an edge. */
export const areAdjacent = (a: TerritoryId, b: TerritoryId): boolean =>
  ADJACENCY[a].includes(b);

/** The territories that make up a continent. */
export const territoriesOfContinent = (
  c: ContinentId
): readonly TerritoryId[] => CONTINENTS[c].territories;

/**
 * Border (choke) territories per continent, derived once from the adjacency
 * graph: a territory is a border iff it has at least one neighbour in a
 * different continent. Deriving (rather than hard-coding) keeps this in lockstep
 * with `ADJACENCY` automatically. Australia yields its classic single choke
 * (indonesia); North America yields three (alaska, greenland, central_america).
 */
export const CONTINENT_BORDERS: Record<ContinentId, TerritoryId[]> = (() => {
  const result = {} as Record<ContinentId, TerritoryId[]>;
  for (const c of CONTINENT_IDS) result[c] = [];
  for (const t of TERRITORY_IDS) {
    const home = CONTINENT_OF[t];
    const hasForeignNeighbor = ADJACENCY[t].some(
      (n) => CONTINENT_OF[n] !== home
    );
    if (hasForeignNeighbor) result[home].push(t);
  }
  return result;
})();

/** Whether a territory sits on the border of its continent. */
export const isBorderTerritory = (t: TerritoryId): boolean =>
  CONTINENT_BORDERS[continentOf(t)].includes(t);

/**
 * Neighbours of a territory that lie outside its own continent — the specific
 * cross-continent edges an owner must defend to hold the continent bonus.
 */
export const foreignNeighborsOf = (t: TerritoryId): TerritoryId[] => {
  const home = CONTINENT_OF[t];
  return ADJACENCY[t].filter((n) => CONTINENT_OF[n] !== home);
};
