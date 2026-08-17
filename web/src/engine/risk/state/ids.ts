/**
 * Base scalar identifiers shared across state, events, and missions. Kept in
 * their own module so `state.ts` and `missions/types.ts` can both depend on
 * them without an import cycle.
 */

/** A stable per-game seat id, e.g. "p0", "p1". */
export type PlayerId = string;

/** The fixed player-colour palette (also used to identify eliminate-color missions). */
export const PLAYER_COLORS = [
  "red",
  "blue",
  "green",
  "yellow",
  "black",
  "purple",
] as const;
export type PlayerColor = (typeof PLAYER_COLORS)[number];

export type WinCondition = "world_domination" | "secret_mission";

/**
 * The turn/phase state machine states. Setup has its own two sub-phases (claim
 * every territory, then deploy remaining starting armies) before normal turns.
 */
export type Phase =
  | "setup_claim"
  | "setup_deploy"
  | "reinforce"
  | "attack"
  | "fortify"
  | "game_over";
