import { GAMES } from "../games/catalog";
import { awardBonuses, type ArrivalEntry, type GameBonus } from "./bonus";
import type { ScoreEntry } from "./ranking";

/** What a team can see about one level of a session: its attempts, its best score and the bonuses in play. */
export type GamePlayStatus = {
  used: number;
  left: number;
  best: number | null;
  /** Speed places already taken by any team. */
  arrivalTaken: number;
  /** Team that holds the first-perfect bonus, if any. */
  perfectBy: string | null;
  /** Bonus the asking team holds in this level, if any. */
  mine: GameBonus | null;
};

export type PlayStatus = { limit: number; games: Record<string, GamePlayStatus> };

type PlayStatusInput = {
  team: string;
  limit: number;
  /** Started attempts of the team per game id. */
  started: Record<string, number>;
  best: ScoreEntry[];
  arrivals: ArrivalEntry[];
};

/** Combines the stored attempts, scores and arrival stamps into what the team sees in every level. */
export function playStatus({ team, limit, started, best, arrivals }: PlayStatusInput): PlayStatus {
  const awarded = awardBonuses(arrivals);
  const games: Record<string, GamePlayStatus> = {};
  for (const { id } of GAMES) {
    const used = Math.min(Math.max(started[id] ?? 0, 0), limit);
    const teamsWithPlace = Object.values(awarded).filter((bonuses) => bonuses[id]?.place != null).length;
    const perfectTeam = Object.entries(awarded).find(([, bonuses]) => (bonuses[id]?.perfect ?? 0) > 0)?.[0] ?? null;
    games[id] = {
      used,
      left: limit - used,
      best: best.find((entry) => entry.team === team && entry.game === id)?.score ?? null,
      arrivalTaken: teamsWithPlace,
      perfectBy: perfectTeam,
      mine: awarded[team]?.[id] ?? null,
    };
  }
  return { limit, games };
}
