import type { GameState, PlayerColor, PlayerId } from "@engine/risk";

/** Map a player colour to a Mantine theme colour name. */
export const mantineColorOf = (color: PlayerColor): string => {
  switch (color) {
    case "red":
      return "red";
    case "blue":
      return "blue";
    case "green":
      return "green";
    case "yellow":
      return "yellow";
    case "black":
      return "dark";
    case "purple":
      return "grape";
  }
};

/** SVG fill for a territory owned by the given player (grey when unowned). */
export const fillForOwner = (
  state: GameState,
  ownerId: PlayerId | null
): string => {
  if (ownerId === null) return "var(--mantine-color-gray-4)";
  const player = state.players.find((p) => p.id === ownerId);
  if (!player) return "var(--mantine-color-gray-4)";
  return `var(--mantine-color-${mantineColorOf(player.color)}-5)`;
};

/** The Mantine colour name for a player id (falls back to gray). */
export const colorNameForPlayer = (
  state: GameState,
  playerId: PlayerId | null
): string => {
  if (playerId === null) return "gray";
  const player = state.players.find((p) => p.id === playerId);
  return player ? mantineColorOf(player.color) : "gray";
};
