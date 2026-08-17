import { memo, useMemo } from "react";
import { Box } from "@mantine/core";
import {
  ADJACENCY,
  type GameState,
  type TerritoryId,
} from "@engine/risk";
import { fillForOwner } from "../ownerColors";
import { BOARD_GEOMETRY, BOARD_VIEWBOX, CENTER_OF } from "./boardGeometry";

export type MapMode =
  | "view"
  | "place"
  | "attack-source"
  | "attack-target"
  | "fortify-source"
  | "fortify-target"
  | "edit";

export type RiskMapProps = {
  state: GameState;
  mode?: MapMode;
  selected?: TerritoryId | null;
  attackSource?: TerritoryId | null;
  /** Territories to emphasise (legal targets / advisor picks). */
  highlight?: TerritoryId[];
  onTerritoryClick?: (id: TerritoryId) => void;
};

// Undirected edge list, computed once.
const EDGES: [TerritoryId, TerritoryId][] = (() => {
  const edges: [TerritoryId, TerritoryId][] = [];
  for (const a of Object.keys(ADJACENCY) as TerritoryId[]) {
    for (const b of ADJACENCY[a]) {
      if (a < b) edges.push([a, b]);
    }
  }
  return edges;
})();

type ShapeProps = {
  d: string;
  fill: string;
  selected: boolean;
  highlighted: boolean;
  dimmed: boolean;
  onClick?: () => void;
};

const TerritoryShape = memo(function TerritoryShape({
  d,
  fill,
  selected,
  highlighted,
  dimmed,
  onClick,
}: ShapeProps) {
  return (
    <path
      d={d}
      fill={fill}
      fillOpacity={dimmed ? 0.3 : 1}
      stroke={
        selected
          ? "var(--mantine-color-accent-7)"
          : highlighted
            ? "var(--mantine-color-yellow-6)"
            : "rgba(0,0,0,0.35)"
      }
      strokeWidth={selected || highlighted ? 3.5 : 1}
      style={{ cursor: onClick ? "pointer" : "default", transition: "fill 120ms" }}
      onClick={onClick}
    />
  );
});

export default function RiskMap({
  state,
  mode = "view",
  selected = null,
  attackSource = null,
  highlight = [],
  onTerritoryClick,
}: RiskMapProps) {
  const highlightSet = useMemo(() => new Set(highlight), [highlight]);

  return (
    <Box
      style={{
        width: "100%",
        background: "var(--mantine-color-blue-0)",
        borderRadius: "var(--mantine-radius-lg)",
        overflow: "hidden",
        userSelect: "none",
        WebkitUserSelect: "none",
      }}
    >
      <svg viewBox={BOARD_VIEWBOX} width="100%" role="img" aria-label="Risk board">
        {/* adjacency + sea routes */}
        <g stroke="rgba(0,0,0,0.18)" strokeWidth={1.5}>
          {EDGES.map(([a, b]) => {
            const pa = CENTER_OF(a);
            const pb = CENTER_OF(b);
            return (
              <line key={`${a}-${b}`} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} />
            );
          })}
        </g>

        {/* territories */}
        {BOARD_GEOMETRY.map((geo) => {
          const owner = state.territories[geo.id].ownerId;
          const isSelected = selected === geo.id || attackSource === geo.id;
          const isHighlighted = highlightSet.has(geo.id);
          const dimmed =
            (mode === "attack-target" || mode === "fortify-target") &&
            highlight.length > 0 &&
            !isHighlighted &&
            !isSelected;
          return (
            <TerritoryShape
              key={geo.id}
              d={geo.d}
              fill={fillForOwner(state, owner)}
              selected={isSelected}
              highlighted={isHighlighted}
              dimmed={dimmed}
              onClick={
                onTerritoryClick ? () => onTerritoryClick(geo.id) : undefined
              }
            />
          );
        })}

        {/* labels + army counts */}
        {BOARD_GEOMETRY.map((geo) => {
          const { armies } = state.territories[geo.id];
          return (
            <g key={`label-${geo.id}`} pointerEvents="none">
              <text
                x={geo.label.x}
                y={geo.label.y - 4}
                textAnchor="middle"
                fontSize={8.5}
                fill="rgba(0,0,0,0.75)"
              >
                {geo.id.replace(/_/g, " ")}
              </text>
              <circle
                cx={geo.label.x}
                cy={geo.label.y + 11}
                r={9}
                fill="white"
                fillOpacity={0.92}
                stroke="rgba(0,0,0,0.4)"
              />
              <text
                x={geo.label.x}
                y={geo.label.y + 11}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={10}
                fontWeight={700}
                fill="black"
              >
                {armies}
              </text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}
