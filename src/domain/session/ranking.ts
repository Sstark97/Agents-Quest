import { GAME_IDS } from "../games/catalog";

/** Best score of a team in one game. */
export type ScoreEntry = { team: string; game: string; score: number };
export type TeamRow = { team: string; total: number; games: Record<string, number>; avatar: number };

/** Groups the best scores by team and orders the teams by total, highest first. */
export function buildRanking(entries: ScoreEntry[], avatars: Record<string, number>): TeamRow[] {
  const teams = new Map<string, TeamRow>();
  for (const { team, game, score } of entries) {
    if (!GAME_IDS.includes(game)) continue;
    const row = teams.get(team) ?? { team, total: 0, games: {}, avatar: avatars[team] ?? 0 };
    row.games[game] = score;
    row.total += score;
    teams.set(team, row);
  }
  return [...teams.values()].sort((a, b) => b.total - a.total);
}
