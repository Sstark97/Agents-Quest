import type { AttemptKind } from "../../application/server/ports";
import type { ConsentRecord } from "../../domain/session/email";
import type { ArrivalEntry, ArrivalMark } from "../../domain/session/bonus";
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

/** Field of the attempt counters: team, game and kind of counter. */
export const attemptField = (team: string, game: string, kind: AttemptKind) => `${scoreField(team, game)}${COUNTER_SEPARATOR}${kind}`;

/** Field of the arrival stamps: team, game and mark. Marks never contain the separator, so it is split at the last one. */
export const arrivalField = (team: string, game: string, mark: ArrivalMark) => `${scoreField(team, game)}${COUNTER_SEPARATOR}${mark}`;

export function parseArrivalField(field: string, sequence: number): ArrivalEntry {
  const at = field.lastIndexOf(COUNTER_SEPARATOR);
  const { team, game } = parseScoreField(field.slice(0, at), 0);
  return { team, game, mark: field.slice(at + 1) as ArrivalMark, sequence };
}

/** Counters bumped by one play: the play itself plus each of its mistake labels. */
export const counterFields = ({ game, tags }: ScoreSubmission) => [`${game}${COUNTER_SEPARATOR}${PLAYS_COUNTER}`, ...tags.map((tag) => `${game}${COUNTER_SEPARATOR}${tag}`)];

export function parseCounterField(field: string, count: number): PlayCounter {
  const at = field.indexOf(COUNTER_SEPARATOR);
  return { game: field.slice(0, at), tag: field.slice(at + 1), count };
}

/** A stored consent record, or null when the stored text is not one (it is then skipped). */
export function parseStoredConsent(json: string): ConsentRecord | null {
  try {
    const value: unknown = JSON.parse(json);
    if (typeof value !== "object" || value === null) return null;
    const { team, email, consentedAt, version } = value as Record<string, unknown>;
    return typeof team === "string" && typeof email === "string" && typeof consentedAt === "string" && typeof version === "string" ? { team, email, consentedAt, version } : null;
  } catch {
    return null;
  }
}
