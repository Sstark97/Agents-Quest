import { GAME_IDS, type Game } from "../games/catalog";
import { passScore, type ScoreBoard } from "../games/progress";

/** Counter name that tracks how many plays of a game were completed. */
export const PLAYS_COUNTER = "_plays";

/** How many times something happened in a game: a completed play or a mistake label. */
export type PlayCounter = { game: string; tag: string; count: number };
export type Stats = { plays: Record<string, number>; tags: PlayCounter[] };

/** Splits the raw counters into plays per game and mistake labels, most frequent first. */
export function buildStats(counters: PlayCounter[]): Stats {
  const stats: Stats = { plays: {}, tags: [] };
  for (const { game, tag, count } of counters) {
    if (!GAME_IDS.includes(game)) continue;
    if (tag === PLAYS_COUNTER) stats.plays[game] = count;
    else stats.tags.push({ game, tag, count });
  }
  stats.tags.sort((a, b) => b.count - a.count);
  return stats;
}

/** Share of the plays of a game in which something happened, as a whole percentage. */
export const shareOfPlays = (count: number, plays: number) => Math.round((100 * count) / plays);

const TOP_MISTAKES = 4;
export type LevelSummary = { plays: number; topMistakes: PlayCounter[]; teamsPlayed: number; teamsPassed: number; averageScore: number };

/** How a session is doing in one level: who passed it, the average score and the most common mistakes. */
export function summarizeLevel(game: Game, stats: Stats, teams: { games: ScoreBoard }[]): LevelSummary {
  const played = teams.filter((team) => team.games[game.id] !== undefined);
  return {
    plays: stats.plays[game.id],
    topMistakes: stats.tags.filter((counter) => counter.game === game.id).slice(0, TOP_MISTAKES),
    teamsPlayed: played.length,
    teamsPassed: played.filter((team) => team.games[game.id] >= passScore(game)).length,
    averageScore: played.length ? Math.round(played.reduce((sum, team) => sum + team.games[game.id], 0) / played.length) : 0,
  };
}
