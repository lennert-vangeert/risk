import { type TerritoryId } from "./territories";

/**
 * The canonical Risk adjacency graph. Sea routes (e.g. alaska<->kamchatka,
 * brazil<->north_africa, siam<->indonesia) are ordinary undirected edges — the
 * engine treats land and sea connections identically for movement and attack.
 *
 * The graph MUST be symmetric: if `a` lists `b`, then `b` must list `a`. This
 * is the single most error-prone data set on the board, so `adjacency.test.ts`
 * asserts symmetry, id-validity, and no self-loops. `satisfies` guarantees
 * every one of the 42 territories has an entry.
 */
export const ADJACENCY: Record<TerritoryId, TerritoryId[]> = {
  // --- North America ---
  alaska: ["northwest_territory", "alberta", "kamchatka"],
  northwest_territory: ["alaska", "alberta", "ontario", "greenland"],
  greenland: ["northwest_territory", "ontario", "quebec", "iceland"],
  alberta: ["alaska", "northwest_territory", "ontario", "western_us"],
  ontario: [
    "alberta",
    "northwest_territory",
    "greenland",
    "quebec",
    "western_us",
    "eastern_us",
  ],
  quebec: ["greenland", "ontario", "eastern_us"],
  western_us: ["alberta", "ontario", "eastern_us", "central_america"],
  eastern_us: ["ontario", "quebec", "western_us", "central_america"],
  central_america: ["western_us", "eastern_us", "venezuela"],

  // --- South America ---
  venezuela: ["central_america", "peru", "brazil"],
  peru: ["venezuela", "brazil", "argentina"],
  brazil: ["venezuela", "peru", "argentina", "north_africa"],
  argentina: ["peru", "brazil"],

  // --- Europe ---
  iceland: ["greenland", "great_britain", "scandinavia"],
  great_britain: [
    "iceland",
    "scandinavia",
    "northern_europe",
    "western_europe",
  ],
  scandinavia: ["iceland", "great_britain", "northern_europe", "ukraine"],
  northern_europe: [
    "great_britain",
    "scandinavia",
    "ukraine",
    "southern_europe",
    "western_europe",
  ],
  western_europe: [
    "great_britain",
    "northern_europe",
    "southern_europe",
    "north_africa",
  ],
  southern_europe: [
    "northern_europe",
    "western_europe",
    "ukraine",
    "middle_east",
    "egypt",
    "north_africa",
  ],
  ukraine: [
    "scandinavia",
    "northern_europe",
    "southern_europe",
    "ural",
    "afghanistan",
    "middle_east",
  ],

  // --- Africa ---
  north_africa: [
    "brazil",
    "western_europe",
    "southern_europe",
    "egypt",
    "east_africa",
    "congo",
  ],
  egypt: ["southern_europe", "north_africa", "east_africa", "middle_east"],
  east_africa: [
    "egypt",
    "north_africa",
    "congo",
    "south_africa",
    "madagascar",
    "middle_east",
  ],
  congo: ["north_africa", "east_africa", "south_africa"],
  south_africa: ["congo", "east_africa", "madagascar"],
  madagascar: ["east_africa", "south_africa"],

  // --- Asia ---
  ural: ["ukraine", "siberia", "china", "afghanistan"],
  siberia: ["ural", "yakutsk", "irkutsk", "mongolia", "china"],
  yakutsk: ["siberia", "irkutsk", "kamchatka"],
  kamchatka: ["yakutsk", "irkutsk", "mongolia", "japan", "alaska"],
  irkutsk: ["siberia", "yakutsk", "kamchatka", "mongolia"],
  mongolia: ["siberia", "irkutsk", "kamchatka", "japan", "china"],
  japan: ["kamchatka", "mongolia"],
  afghanistan: ["ukraine", "ural", "china", "india", "middle_east"],
  china: ["ural", "siberia", "mongolia", "afghanistan", "india", "siam"],
  middle_east: [
    "ukraine",
    "southern_europe",
    "egypt",
    "east_africa",
    "afghanistan",
    "india",
  ],
  india: ["afghanistan", "china", "middle_east", "siam"],
  siam: ["china", "india", "indonesia"],

  // --- Australia ---
  indonesia: ["siam", "new_guinea", "western_australia"],
  new_guinea: ["indonesia", "western_australia", "eastern_australia"],
  western_australia: ["indonesia", "new_guinea", "eastern_australia"],
  eastern_australia: ["new_guinea", "western_australia"],
};
