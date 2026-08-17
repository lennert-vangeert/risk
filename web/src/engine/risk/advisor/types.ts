import { type TerritoryId } from "../board/territories";
import { type Card } from "../cards/deck";
import { type Phase } from "../state/ids";

export type RecommendationKind =
  | "trade_in"
  | "place"
  | "attack"
  | "fortify"
  | "defend"
  | "stop";

type Base = {
  /** Higher = stronger recommendation. */
  score: number;
  /** i18n key under the "engine" namespace. */
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  /** Deterministic secondary sort key for reproducible ordering. */
  tiebreak: string;
};

/**
 * A ranked recommendation. The `kind` discriminates the action payload so the
 * UI can turn it straight into a GameEvent (or an "Apply" button).
 */
export type Recommendation =
  | (Base & {
      kind: "trade_in";
      cards?: [Card, Card, Card];
      matchTerritory?: TerritoryId;
      value: number;
    })
  | (Base & { kind: "place"; territory: TerritoryId; armies: number })
  | (Base & {
      kind: "attack";
      from: TerritoryId;
      to: TerritoryId;
      pConquer: number;
      expectedSurvivors: number;
    })
  | (Base & { kind: "fortify"; from: TerritoryId; to: TerritoryId; count: number })
  | (Base & { kind: "defend"; territory: TerritoryId; dice: number })
  | (Base & { kind: "stop" });

export type ThreatFlag = {
  reasonKey: string;
  reasonParams: Record<string, string | number>;
  /** 0..1 urgency, used for sorting and next-turn placement weighting. */
  urgency: number;
  /** Territories goofball should hold/deny in response. */
  denialTerritories?: TerritoryId[];
};

export type Advice = {
  phase: Phase;
  recommendations: Recommendation[];
  flags: ThreatFlag[];
};
