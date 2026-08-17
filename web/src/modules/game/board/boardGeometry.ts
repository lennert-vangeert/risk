import {
  TERRITORY_IDS,
  CONTINENT_OF,
  type TerritoryId,
  type ContinentId,
} from "@engine/risk";

/**
 * Geometry-as-data for the interactive board. Each territory is positioned at
 * its approximate real-world spot on a 960x520 canvas; the SVG path is derived
 * from that centre. This schematic layout is fully swappable: dropping in a
 * traced continent-silhouette map means replacing these coordinates/paths with
 * the real region paths + centroids — no component changes.
 */
export const BOARD_VIEWBOX = "0 0 960 520";

type Point = { x: number; y: number };

const CENTERS: Record<TerritoryId, Point> = {
  // North America
  alaska: { x: 70, y: 80 },
  northwest_territory: { x: 160, y: 70 },
  greenland: { x: 320, y: 55 },
  alberta: { x: 120, y: 140 },
  ontario: { x: 205, y: 140 },
  quebec: { x: 290, y: 135 },
  western_us: { x: 130, y: 205 },
  eastern_us: { x: 225, y: 210 },
  central_america: { x: 165, y: 270 },
  // South America
  venezuela: { x: 220, y: 330 },
  peru: { x: 215, y: 400 },
  brazil: { x: 300, y: 385 },
  argentina: { x: 230, y: 470 },
  // Europe
  iceland: { x: 420, y: 90 },
  great_britain: { x: 415, y: 155 },
  scandinavia: { x: 500, y: 70 },
  northern_europe: { x: 495, y: 150 },
  western_europe: { x: 430, y: 225 },
  southern_europe: { x: 510, y: 215 },
  ukraine: { x: 590, y: 120 },
  // Africa
  north_africa: { x: 460, y: 320 },
  egypt: { x: 540, y: 295 },
  east_africa: { x: 590, y: 360 },
  congo: { x: 515, y: 390 },
  south_africa: { x: 525, y: 465 },
  madagascar: { x: 610, y: 445 },
  // Asia
  ural: { x: 660, y: 100 },
  siberia: { x: 735, y: 75 },
  yakutsk: { x: 815, y: 55 },
  kamchatka: { x: 895, y: 80 },
  irkutsk: { x: 775, y: 130 },
  mongolia: { x: 800, y: 175 },
  japan: { x: 905, y: 175 },
  afghanistan: { x: 670, y: 185 },
  china: { x: 790, y: 240 },
  middle_east: { x: 620, y: 255 },
  india: { x: 725, y: 280 },
  siam: { x: 810, y: 300 },
  // Australia
  indonesia: { x: 820, y: 375 },
  new_guinea: { x: 905, y: 370 },
  western_australia: { x: 840, y: 455 },
  eastern_australia: { x: 915, y: 455 },
};

const REGION_W = 78;
const REGION_H = 46;
const REGION_R = 10;

/** Rounded-rectangle SVG path centred at (cx, cy). */
const roundedRect = (cx: number, cy: number): string => {
  const x = cx - REGION_W / 2;
  const y = cy - REGION_H / 2;
  const w = REGION_W;
  const h = REGION_H;
  const r = REGION_R;
  return [
    `M${x + r},${y}`,
    `h${w - 2 * r}`,
    `a${r},${r} 0 0 1 ${r},${r}`,
    `v${h - 2 * r}`,
    `a${r},${r} 0 0 1 ${-r},${r}`,
    `h${-(w - 2 * r)}`,
    `a${r},${r} 0 0 1 ${-r},${-r}`,
    `v${-(h - 2 * r)}`,
    `a${r},${r} 0 0 1 ${r},${-r}`,
    "z",
  ].join(" ");
};

export type TerritoryGeometry = {
  id: TerritoryId;
  continent: ContinentId;
  center: Point;
  d: string;
  /** Centroid for the army-count badge. */
  label: Point;
};

export const BOARD_GEOMETRY: TerritoryGeometry[] = TERRITORY_IDS.map((id) => {
  const center = CENTERS[id];
  return {
    id,
    continent: CONTINENT_OF[id],
    center,
    d: roundedRect(center.x, center.y),
    label: { x: center.x, y: center.y },
  };
});

export const CENTER_OF = (id: TerritoryId): Point => CENTERS[id];
