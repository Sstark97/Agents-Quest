import type { KeyValueStore, Reply, SessionGateway } from "../../src/application/client/ports";
import type { AttemptKind, RandomSource, ScoreRepository, SessionRepository } from "../../src/application/server/ports";
import type { ArrivalEntry } from "../../src/domain/session/bonus";
import type { PlayCounter } from "../../src/domain/session/stats";
import type { ScoreEntry } from "../../src/domain/session/ranking";
import type { SessionRecord } from "../../src/domain/session/session";

/** Key-value store that lives in memory, standing in for the browser's localStorage. */
export function fakeStore(initial: Record<string, string> = {}): KeyValueStore & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    read: (key) => data[key] ?? "",
    write: (key, value) => { data[key] = value; },
    remove: (key) => { delete data[key]; },
  };
}

export const reply = <T>(status: number, body: T | null = null): Reply<T> => ({ ok: status >= 200 && status < 300, status, body });

/** Gateway whose calls fail as if there were no connection, unless overridden. */
export function fakeGateway(overrides: Partial<SessionGateway> = {}): SessionGateway {
  const offline = () => Promise.reject(new Error("offline"));
  return { findSession: offline, createSession: offline, runFacilitatorAction: offline, startAttempt: offline, submitScore: offline, getRanking: offline, getStats: offline, ...overrides };
}

export function fakeSessionRepository(): SessionRepository & { records: Record<string, SessionRecord> } {
  const records: Record<string, SessionRecord> = {};
  return {
    records,
    async create(code, session) { if (records[code]) return false; records[code] = { ...session }; return true; },
    async find(code) { return records[code] ? { ...records[code] } : null; },
    async setClosed(code, closed) { records[code].closed = closed; },
    async setUnlocked(code, levels) { records[code].unlocked = levels; },
    async setAttemptLimit(code, limit) { records[code].attemptLimit = limit; },
    async delete(code) { delete records[code]; },
  };
}

export function fakeScoreRepository(): ScoreRepository & { cleared: string[] } {
  const best: Record<string, ScoreEntry[]> = {};
  const avatars: Record<string, Record<string, number>> = {};
  const counters: Record<string, PlayCounter[]> = {};
  const attempts: Record<string, Record<string, number>> = {};
  const attemptKey = (team: string, game: string, kind: AttemptKind) => `${team}::${game}|${kind}`;
  const sequences: Record<string, number> = {};
  const arrivals: Record<string, ArrivalEntry[]> = {};
  const cleared: string[] = [];
  const bump = (list: PlayCounter[], game: string, tag: string) => {
    const counter = list.find((other) => other.game === game && other.tag === tag);
    if (counter) counter.count++; else list.push({ game, tag, count: 1 });
  };
  return {
    cleared,
    async record(code, { team, game, score, avatar, tags }, sequence) {
      const entries = (best[code] ??= []);
      const entry = entries.find((other) => other.team === team && other.game === game);
      const improved = score > (entry?.score ?? 0);
      if (!entry) entries.push({ team, game, score }); else entry.score = Math.max(entry.score, score);
      if (sequence !== undefined && improved) {
        const list = (arrivals[code] ??= []);
        const stamp = list.find((other) => other.team === team && other.game === game && other.mark === "best");
        if (stamp) stamp.sequence = sequence; else list.push({ team, game, mark: "best", sequence });
      }
      (avatars[code] ??= {})[team] = avatar;
      const list = (counters[code] ??= []);
      bump(list, game, "_plays");
      tags.forEach((tag) => bump(list, game, tag));
    },
    async nextSequence(code) { return (sequences[code] = (sequences[code] ?? 0) + 1); },
    async stampFirst(code, team, game, mark, sequence) {
      const list = (arrivals[code] ??= []);
      if (!list.some((other) => other.team === team && other.game === game && other.mark === mark)) list.push({ team, game, mark, sequence });
    },
    async arrivals(code) { return (arrivals[code] ?? []).map((entry) => ({ ...entry })); },
    async bumpAttempt(code, team, game, kind, delta) {
      const table = (attempts[code] ??= {});
      const key = attemptKey(team, game, kind);
      return (table[key] = (table[key] ?? 0) + delta);
    },
    async attemptCount(code, team, game, kind) { return attempts[code]?.[attemptKey(team, game, kind)] ?? 0; },
    async bestScores(code) { return best[code] ?? []; },
    async avatars(code) { return avatars[code] ?? {}; },
    async counters(code) { return counters[code] ?? []; },
    async clear(code) { cleared.push(code); delete best[code]; delete avatars[code]; delete counters[code]; delete attempts[code]; delete sequences[code]; delete arrivals[code]; },
  };
}

/** Random source that hands out the given byte sequences in order, then zeros. */
export function fakeRandom(...sequences: number[][]): RandomSource {
  let call = 0;
  return {
    bytes: (length) => Uint8Array.from(sequences[call++] ?? Array(length).fill(0)),
    hex: (length) => "ab".repeat(length),
  };
}
