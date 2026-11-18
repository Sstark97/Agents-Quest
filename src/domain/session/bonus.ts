/** Share of a level's maximum score a result needs to compete for the speed bonuses. */
export const BONUS_RATIO = 0.8;
/** Speed bonus of the first, second and third team to pass a level with a good score. */
export const ARRIVAL_BONUSES = [45, 30, 15];
/** Extra bonus for the first team to reach the maximum score of a level. */
export const FIRST_PERFECT_BONUS = 30;

type ScoredGame = { maxScore: number };

/** Lowest score of a level that earns bonuses. */
export const bonusScore = (game: ScoredGame) => Math.ceil(game.maxScore * BONUS_RATIO);

/**
 * What the server stamps with its own sequence number:
 * "qualified" the first time the team reaches the bonus score, "perfect" the first time it reaches the
 * maximum score and "best" every time its best score improves.
 */
export type ArrivalMark = "qualified" | "perfect" | "best";

/** `sequence` grows with every stamp of the session, so a lower number means an earlier arrival. */
export type ArrivalEntry = { team: string; game: string; mark: ArrivalMark; sequence: number };

/** The marks a result deserves in addition to "best". */
export function arrivalMarks(game: ScoredGame, score: number): ("qualified" | "perfect")[] {
  if (score >= game.maxScore) return ["qualified", "perfect"];
  return score >= bonusScore(game) ? ["qualified"] : [];
}

/** Bonus of a team in one game: `place` is its arrival place (1..3) when it earned a speed bonus. */
export type GameBonus = { place: number | null; arrival: number; perfect: number };

const NO_BONUS: GameBonus = { place: null, arrival: 0, perfect: 0 };

/** Gives the bonuses out. Stamps never change, so a later improvement can neither move nor repeat a bonus. */
export function awardBonuses(arrivals: ArrivalEntry[]): Record<string, Record<string, GameBonus>> {
  const awarded: Record<string, Record<string, GameBonus>> = {};
  const award = (team: string, game: string, change: Partial<GameBonus>) => {
    const teamBonuses = (awarded[team] ??= {});
    teamBonuses[game] = { ...(teamBonuses[game] ?? NO_BONUS), ...change };
  };
  const games = [...new Set(arrivals.map((entry) => entry.game))];
  for (const game of games) {
    const inGame = arrivals.filter((entry) => entry.game === game);
    const bySequence = (mark: ArrivalMark) => inGame.filter((entry) => entry.mark === mark).sort((a, b) => a.sequence - b.sequence);
    bySequence("qualified").slice(0, ARRIVAL_BONUSES.length).forEach((entry, index) => award(entry.team, game, { place: index + 1, arrival: ARRIVAL_BONUSES[index] }));
    const firstPerfect = bySequence("perfect")[0];
    if (firstPerfect) award(firstPerfect.team, game, { perfect: FIRST_PERFECT_BONUS });
  }
  return awarded;
}

/** When the team finished: the latest improvement of its best scores. Infinity when it has none. */
export function finishedAt(arrivals: ArrivalEntry[], team: string): number {
  const sequences = arrivals.filter((entry) => entry.team === team && entry.mark === "best").map((entry) => entry.sequence);
  return sequences.length ? Math.max(...sequences) : Infinity;
}
