import { findGame } from "../games/catalog";

export const TEAM_NAME_MAX = 30;
export const AVATAR_COUNT = 8;
const TAG_MAX_LENGTH = 80;
const TAGS_MAX = 12;
/** Separator used by the storage to join team and game: a team name must not contain it. */
export const TEAM_GAME_SEPARATOR = "::";

/** One finished play of a level, ready to be recorded in the session ranking. */
export type ScoreSubmission = { team: string; game: string; score: number; avatar: number; tags: string[] };

export const sanitizeTeamName = (raw: unknown) => (typeof raw === "string" ? raw.trim().slice(0, TEAM_NAME_MAX) : "");

const sanitizeAvatar = (raw: unknown) => (Number.isInteger(raw) && (raw as number) >= 0 && (raw as number) < AVATAR_COUNT ? (raw as number) : 0);

/** Mistake labels of the play: trimmed, de-duplicated and capped. */
const sanitizeTags = (raw: unknown) =>
  Array.isArray(raw)
    ? [...new Set(raw.filter((tag): tag is string => typeof tag === "string").map((tag) => tag.trim().slice(0, TAG_MAX_LENGTH)).filter(Boolean))].slice(0, TAGS_MAX)
    : [];

/** Validates untrusted input. Returns null when the submission must be rejected. */
export function parseScoreSubmission(raw: { team?: unknown; game?: unknown; score?: unknown; avatar?: unknown; tags?: unknown } | null): ScoreSubmission | null {
  const team = sanitizeTeamName(raw?.team);
  const game = findGame(raw?.game);
  const score = Number(raw?.score);
  if (!team || team.includes(TEAM_GAME_SEPARATOR) || !game || !Number.isInteger(score) || score < 0 || score > game.maxScore) return null;
  return { team, game: game.id, score, avatar: sanitizeAvatar(raw?.avatar), tags: sanitizeTags(raw?.tags) };
}
