import { GAMES, type Game } from "./catalog";

/** Best score per game id, as kept by the player's device. */
export type ScoreBoard = Record<string, number>;

/** A level counts as passed with 60 % of its maximum score. */
export const PASS_RATIO = 0.6;
export const passScore = (game: Game) => Math.ceil(game.maxScore * PASS_RATIO);
export const isPassed = (game: Game, scores: ScoreBoard) => (scores[game.id] ?? 0) >= passScore(game);

export type LevelState = "done" | "open" | "locked";

/** The facilitator opens the levels: the first `unlocked` ones are playable. */
export function levelStates(scores: ScoreBoard, unlocked: number): LevelState[] {
  return GAMES.map((game, index) => (index >= unlocked ? "locked" : isPassed(game, scores) ? "done" : "open"));
}

/**
 * Level a team is currently on: the first one it has not passed yet, never beyond the last open one.
 * Returns `GAMES.length` when the team has passed them all.
 */
export function currentLevelIndex(scores: ScoreBoard, unlocked: number): number {
  const firstPending = GAMES.findIndex((game) => !isPassed(game, scores));
  return firstPending < 0 ? GAMES.length : Math.min(firstPending, Math.max(0, unlocked - 1));
}
