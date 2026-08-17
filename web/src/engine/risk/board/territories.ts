/**
 * The 42 territories of the classic Risk board.
 *
 * The order below is grouped by continent and is the canonical iteration order
 * used throughout the engine. `TerritoryId` is a string-literal union derived
 * from this array (single source of truth), so adding/removing a territory is a
 * one-line change that the type system propagates everywhere.
 *
 * Ids are lowercase snake_case and double as i18n key suffixes on the UI side
 * (e.g. `t("territories.alaska")`), keeping the engine itself UI-agnostic.
 */
export const TERRITORY_IDS = [
  // North America (9)
  "alaska",
  "northwest_territory",
  "greenland",
  "alberta",
  "ontario",
  "quebec",
  "western_us",
  "eastern_us",
  "central_america",
  // South America (4)
  "venezuela",
  "peru",
  "brazil",
  "argentina",
  // Europe (7)
  "iceland",
  "great_britain",
  "scandinavia",
  "northern_europe",
  "western_europe",
  "southern_europe",
  "ukraine",
  // Africa (6)
  "north_africa",
  "egypt",
  "east_africa",
  "congo",
  "south_africa",
  "madagascar",
  // Asia (12)
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
  // Australia (4)
  "indonesia",
  "new_guinea",
  "western_australia",
  "eastern_australia",
] as const;

export type TerritoryId = (typeof TERRITORY_IDS)[number];

/** Total number of territories on the board (42). */
export const TERRITORY_COUNT = TERRITORY_IDS.length;

/** Fast membership check for runtime-sourced strings (e.g. narrated input). */
const TERRITORY_ID_SET: ReadonlySet<string> = new Set(TERRITORY_IDS);

export const isTerritoryId = (value: unknown): value is TerritoryId =>
  typeof value === "string" && TERRITORY_ID_SET.has(value);
