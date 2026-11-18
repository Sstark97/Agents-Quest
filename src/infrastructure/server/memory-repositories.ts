import type { ScoreRepository, SessionRepository } from "../../application/server/ports";
import type { SessionRecord } from "../../domain/session/session";
import { arrivalField, attemptField, counterFields, parseArrivalField, parseCounterField, parseScoreField, scoreField } from "./storage-schema";

/**
 * In-memory storage for local development. It hangs from `globalThis` so it survives hot reloads;
 * on a serverless host it is lost between requests.
 */
type MemoryStore = {
  __sessions?: Record<string, SessionRecord>;
  __scores?: Record<string, Record<string, number>>;
  __avatars?: Record<string, Record<string, number>>;
  __stats?: Record<string, Record<string, number>>;
  __attempts?: Record<string, Record<string, number>>;
  __seq?: Record<string, number>;
  __arrivals?: Record<string, Record<string, number>>;
};
const store = globalThis as unknown as Required<MemoryStore>;
store.__sessions ??= {};
store.__scores ??= {};
store.__avatars ??= {};
store.__stats ??= {};
store.__attempts ??= {};
store.__seq ??= {};
store.__arrivals ??= {};

export function createMemorySessionRepository(): SessionRepository {
  return {
    async create(code, session) {
      if (store.__sessions[code]) return false;
      store.__sessions[code] = { ...session };
      return true;
    },
    async find(code) {
      const session = store.__sessions[code];
      return session ? { ...session, unlocked: session.unlocked ?? 0, attemptLimit: session.attemptLimit ?? null } : null;
    },
    async setClosed(code, closed) { if (store.__sessions[code]) store.__sessions[code].closed = closed; },
    async setUnlocked(code, levels) { if (store.__sessions[code]) store.__sessions[code].unlocked = levels; },
    async setAttemptLimit(code, limit) { if (store.__sessions[code]) store.__sessions[code].attemptLimit = limit; },
    async delete(code) { delete store.__sessions[code]; },
  };
}

export function createMemoryScoreRepository(): ScoreRepository {
  return {
    async record(code, submission, sequence) {
      const field = scoreField(submission.team, submission.game);
      const scores = (store.__scores[code] ??= {});
      const previous = scores[field] ?? 0;
      scores[field] = Math.max(previous, submission.score);
      if (sequence !== undefined && submission.score > previous) (store.__arrivals[code] ??= {})[arrivalField(submission.team, submission.game, "best")] = sequence;
      (store.__avatars[code] ??= {})[submission.team] = submission.avatar;
      const counters = (store.__stats[code] ??= {});
      for (const counter of counterFields(submission)) counters[counter] = (counters[counter] ?? 0) + 1;
    },
    async nextSequence(code) { return (store.__seq[code] = (store.__seq[code] ?? 0) + 1); },
    async stampFirst(code, team, game, mark, sequence) {
      const arrivals = (store.__arrivals[code] ??= {});
      arrivals[arrivalField(team, game, mark)] ??= sequence;
    },
    async arrivals(code) { return Object.entries(store.__arrivals[code] ?? {}).map(([field, sequence]) => parseArrivalField(field, sequence)); },
    async bumpAttempt(code, team, game, kind, delta) {
      const attempts = (store.__attempts[code] ??= {});
      const field = attemptField(team, game, kind);
      return (attempts[field] = (attempts[field] ?? 0) + delta);
    },
    async attemptCount(code, team, game, kind) { return store.__attempts[code]?.[attemptField(team, game, kind)] ?? 0; },
    async bestScores(code) { return Object.entries(store.__scores[code] ?? {}).map(([field, score]) => parseScoreField(field, score)); },
    async avatars(code) { return store.__avatars[code] ?? {}; },
    async counters(code) { return Object.entries(store.__stats[code] ?? {}).map(([field, count]) => parseCounterField(field, count)); },
    async clear(code) { delete store.__scores[code]; delete store.__avatars[code]; delete store.__stats[code]; delete store.__attempts[code]; delete store.__seq[code]; delete store.__arrivals[code]; },
  };
}
