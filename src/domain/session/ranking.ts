import { GAME_IDS } from "../games/catalog";
import { awardBonuses, finishedAt, type ArrivalEntry, type GameBonus } from "./bonus";

/** Best score of a team in one game. */
export type ScoreEntry = { team: string; game: string; score: number };

/**
 * `games` holds the base score of each game and `base` their sum; `bonus` adds up the bonuses and
 * `bonuses` details them per game (only the games that earned one). `total` = `base` + both bonuses.
 */
export type TeamRow = {
  team: string;
  total: number;
  games: Record<string, number>;
  avatar: number;
  base: number;
  bonus: { arrival: number; perfect: number };
  bonuses: Record<string, GameBonus>;
};

const compare = (a: number, b: number) => (a < b ? -1 : a > b ? 1 : 0);

/** Groups the best scores by team and orders the teams by total, highest first; the team that finished earlier wins a tie. */
export function buildRanking(entries: ScoreEntry[], avatars: Record<string, number>, arrivals: ArrivalEntry[] = []): TeamRow[] {
  const knownArrivals = arrivals.filter((entry) => GAME_IDS.includes(entry.game));
  const awarded = awardBonuses(knownArrivals);
  const teams = new Map<string, TeamRow>();
  for (const { team, game, score } of entries) {
    if (!GAME_IDS.includes(game)) continue;
    const row = teams.get(team) ?? { team, total: 0, games: {}, avatar: avatars[team] ?? 0, base: 0, bonus: { arrival: 0, perfect: 0 }, bonuses: {} };
    row.games[game] = score;
    row.base += score;
    teams.set(team, row);
  }
  for (const row of teams.values()) {
    row.bonuses = awarded[row.team] ?? {};
    for (const bonus of Object.values(row.bonuses)) {
      row.bonus.arrival += bonus.arrival;
      row.bonus.perfect += bonus.perfect;
    }
    row.total = row.base + row.bonus.arrival + row.bonus.perfect;
  }
  const finished = new Map([...teams.keys()].map((team) => [team, finishedAt(knownArrivals, team)]));
  return [...teams.values()].sort((a, b) => b.total - a.total || compare(finished.get(a.team)!, finished.get(b.team)!));
}
