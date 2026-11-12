import type { ScoreRepository, SessionRepository } from "../../application/server/ports";
import type { SessionRecord } from "../../domain/session/session";
import { counterFields, parseCounterField, parseScoreField, scoreField } from "./storage-schema";

/**
 * In-memory storage for local development. It hangs from `globalThis` so it survives hot reloads;
 * on a serverless host it is lost between requests.
 */
type MemoryStore = {
  __sessions?: Record<string, SessionRecord>;
  __scores?: Record<string, Record<string, number>>;
  __avatars?: Record<string, Record<string, number>>;
  __stats?: Record<string, Record<string, number>>;
};
const store = globalThis as unknown as Required<MemoryStore>;
store.__sessions ??= {};
store.__scores ??= {};
store.__avatars ??= {};
store.__stats ??= {};

export function createMemorySessionRepository(): SessionRepository {
  return {
    async create(code, session) {
      if (store.__sessions[code]) return false;
      store.__sessions[code] = { ...session };
      return true;
    },
    async find(code) {
      const session = store.__sessions[code];
      return session ? { ...session, unlocked: session.unlocked ?? 0 } : null;
    },
    async setClosed(code, closed) { if (store.__sessions[code]) store.__sessions[code].closed = closed; },
    async setUnlocked(code, levels) { if (store.__sessions[code]) store.__sessions[code].unlocked = levels; },
    async delete(code) { delete store.__sessions[code]; },
  };
}

export function createMemoryScoreRepository(): ScoreRepository {
  return {
    async record(code, submission) {
      const field = scoreField(submission.team, submission.game);
      const scores = (store.__scores[code] ??= {});
      scores[field] = Math.max(scores[field] ?? 0, submission.score);
      (store.__avatars[code] ??= {})[submission.team] = submission.avatar;
      const counters = (store.__stats[code] ??= {});
      for (const counter of counterFields(submission)) counters[counter] = (counters[counter] ?? 0) + 1;
    },
    async bestScores(code) { return Object.entries(store.__scores[code] ?? {}).map(([field, score]) => parseScoreField(field, score)); },
    async avatars(code) { return store.__avatars[code] ?? {}; },
    async counters(code) { return Object.entries(store.__stats[code] ?? {}).map(([field, count]) => parseCounterField(field, count)); },
    async clear(code) { delete store.__scores[code]; delete store.__avatars[code]; delete store.__stats[code]; },
  };
}
