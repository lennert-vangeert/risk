import { type ContinentId } from "../board/continents";
import { type PlayerColor } from "../state/ids";

/**
 * Secret-mission definitions (classic Risk mission deck). Each is a plain data
 * object so `isComplete`/`progress` (in missions.ts) are exhaustive switches and
 * the whole thing serialises to Firestore.
 */
export type Mission =
  | {
      type: "conquer_continents";
      /** Continents that must be fully controlled. */
      continents: ContinentId[];
      /** Additional any-continents required beyond the named ones. */
      plusAny?: number;
      id: string;
    }
  | {
      type: "hold_n_continents";
      count: number;
      id: string;
    }
  | {
      type: "capture_territories";
      count: number;
      /** Minimum armies required on each counted territory (e.g. 2). */
      minArmiesEach?: number;
      id: string;
    }
  | {
      type: "eliminate_color";
      targetColor: PlayerColor;
      /** Applied when the target is goofball or already eliminated. */
      fallback: Mission;
      id: string;
    };

export type SuspicionLevel = "low" | "medium" | "high";

export type SuspectedMission = {
  mission: Mission;
  confidence: SuspicionLevel;
  note?: string;
};
