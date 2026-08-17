/**
 * Starting armies by player count (classic Risk). The 2-player game uses a
 * neutral-army variant and is out of scope for v1 — supported counts are 3-6.
 */
export const DEFAULT_STARTING_ARMIES: Record<number, number> = {
  2: 40,
  3: 35,
  4: 30,
  5: 25,
  6: 20,
};

export const MIN_PLAYERS = 3;
export const MAX_PLAYERS = 6;

export const startingArmiesFor = (
  playerCount: number,
  table: Record<number, number> = DEFAULT_STARTING_ARMIES
): number => {
  const armies = table[playerCount];
  if (armies === undefined) {
    throw new Error(`No starting-army count for ${playerCount} players`);
  }
  return armies;
};
