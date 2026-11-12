import type { ScoreEntry } from "../../domain/session/ranking";
import { TEAM_GAME_SEPARATOR, type ScoreSubmission } from "../../domain/session/score-submission";
import { PLAYS_COUNTER, type PlayCounter } from "../../domain/session/stats";

/** How scores and counters are flattened into hash fields. Shared by every storage adapter. */
const COUNTER_SEPARATOR = "|";

export const scoreField = (team: string, game: string) => `${team}${TEAM_GAME_SEPARATOR}${game}`;

export function parseScoreField(field: string, score: number): ScoreEntry {
  const [team, game] = field.split(TEAM_GAME_SEPARATOR);
  return { team, game, score };
}

/** Counters bumped by one play: the play itself plus each of its mistake labels. */
export const counterFields = ({ game, tags }: ScoreSubmission) => [`${game}${COUNTER_SEPARATOR}${PLAYS_COUNTER}`, ...tags.map((tag) => `${game}${COUNTER_SEPARATOR}${tag}`)];

export function parseCounterField(field: string, count: number): PlayCounter {
  const at = field.indexOf(COUNTER_SEPARATOR);
  return { game: field.slice(0, at), tag: field.slice(at + 1), count };
}
