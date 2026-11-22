import type { EmailRepository, ScoreRepository, SessionRepository } from "../../application/server/ports";
import type { ConsentRecord } from "../../domain/session/email";
import { SESSION_TTL_SECONDS, parseAttemptLimit } from "../../domain/session/session";
import { arrivalField, attemptField, counterFields, parseArrivalField, parseCounterField, parseScoreField, parseStoredConsent, scoreField } from "./storage-schema";
import { toRecord, type RedisCommand } from "./upstash-redis";

const sessionKey = (code: string) => `aq:session:${code}`;
const scoresKey = (code: string) => `aq:scores:${code}`;
const avatarsKey = (code: string) => `aq:avatars:${code}`;
const statsKey = (code: string) => `aq:stats:${code}`;
const sequenceKey = (code: string) => `aq:seq:${code}`;
const arrivalsKey = (code: string) => `aq:arrivals:${code}`;
const emailsKey = (code: string) => `aq:emails:${code}`;
const attemptsKey = (code: string) => `aq:attempts:${code}`;

export function createUpstashSessionRepository(redis: RedisCommand): SessionRepository {
  return {
    async create(code, session) {
      if ((await redis(["HSETNX", sessionKey(code), "adminKey", session.adminKey])) !== 1) return false;
      await redis(["HSET", sessionKey(code), "name", session.name, "closed", session.closed ? "1" : "0", "unlocked", String(session.unlocked), "emails", session.collectEmails ? "1" : "0", ...(session.attemptLimit === null ? [] : ["attempts", String(session.attemptLimit)])]);
      await redis(["EXPIRE", sessionKey(code), SESSION_TTL_SECONDS]);
      return true;
    },
    async find(code) {
      const fields = toRecord((await redis(["HGETALL", sessionKey(code)])) as string[]);
      return fields.name ? { name: fields.name, closed: fields.closed === "1", adminKey: fields.adminKey, unlocked: Number(fields.unlocked) || 0, attemptLimit: parseAttemptLimit(Number(fields.attempts)), collectEmails: fields.emails === "1" } : null;
    },
    async setClosed(code, closed) { await redis(["HSET", sessionKey(code), "closed", closed ? "1" : "0"]); },
    async setUnlocked(code, levels) { await redis(["HSET", sessionKey(code), "unlocked", levels]); },
    async setAttemptLimit(code, limit) { await redis(["HSET", sessionKey(code), "attempts", limit]); },
    async setCollectEmails(code, enabled) { await redis(["HSET", sessionKey(code), "emails", enabled ? "1" : "0"]); },
    async delete(code) { await redis(["DEL", sessionKey(code)]); },
  };
}

export function createUpstashScoreRepository(redis: RedisCommand): ScoreRepository {
  const numbers = async (key: string) => Object.entries(toRecord((await redis(["HGETALL", key])) as string[])).map(([field, value]) => [field, Number(value)] as const);

  return {
    async record(code, submission, sequence) {
      const field = scoreField(submission.team, submission.game);
      const previous = Number(await redis(["HGET", scoresKey(code), field])) || 0;
      if (submission.score > previous) {
        await redis(["HSET", scoresKey(code), field, submission.score]);
        await redis(["EXPIRE", scoresKey(code), SESSION_TTL_SECONDS]);
        if (sequence !== undefined) {
          await redis(["HSET", arrivalsKey(code), arrivalField(submission.team, submission.game, "best"), sequence]);
          await redis(["EXPIRE", arrivalsKey(code), SESSION_TTL_SECONDS]);
        }
      }
      await redis(["HSET", avatarsKey(code), submission.team, submission.avatar]);
      await redis(["EXPIRE", avatarsKey(code), SESSION_TTL_SECONDS]);
      for (const counter of counterFields(submission)) await redis(["HINCRBY", statsKey(code), counter, 1]);
      await redis(["EXPIRE", statsKey(code), SESSION_TTL_SECONDS]);
    },
    async nextSequence(code) {
      const sequence = Number(await redis(["INCR", sequenceKey(code)]));
      await redis(["EXPIRE", sequenceKey(code), SESSION_TTL_SECONDS]);
      return sequence;
    },
    async stampFirst(code, team, game, mark, sequence) {
      await redis(["HSETNX", arrivalsKey(code), arrivalField(team, game, mark), sequence]);
      await redis(["EXPIRE", arrivalsKey(code), SESSION_TTL_SECONDS]);
    },
    async arrivals(code) { return (await numbers(arrivalsKey(code))).map(([field, sequence]) => parseArrivalField(field, sequence)); },
    async bumpAttempt(code, team, game, kind, delta) {
      const value = Number(await redis(["HINCRBY", attemptsKey(code), attemptField(team, game, kind), delta]));
      await redis(["EXPIRE", attemptsKey(code), SESSION_TTL_SECONDS]);
      return value;
    },
    async attemptCount(code, team, game, kind) { return Number(await redis(["HGET", attemptsKey(code), attemptField(team, game, kind)])) || 0; },
    async attemptCounts(code, team, games, kind) {
      if (!games.length) return {};
      const values = (await redis(["HMGET", attemptsKey(code), ...games.map((game) => attemptField(team, game, kind))])) as (string | null)[];
      return Object.fromEntries(games.map((game, index) => [game, Number(values[index]) || 0]));
    },
    async bestScores(code) { return (await numbers(scoresKey(code))).map(([field, score]) => parseScoreField(field, score)); },
    async avatars(code) { return Object.fromEntries(await numbers(avatarsKey(code))); },
    async counters(code) { return (await numbers(statsKey(code))).map(([field, count]) => parseCounterField(field, count)); },
    async clear(code) { for (const key of [scoresKey(code), avatarsKey(code), statsKey(code), attemptsKey(code), sequenceKey(code), arrivalsKey(code)]) await redis(["DEL", key]); },
  };
}

/** Redis TTL reply for a key that does not exist. */
const SESSION_MISSING_TTL = -2;

export function createUpstashEmailRepository(redis: RedisCommand): EmailRepository {
  return {
    async save(code, record) {
      await redis(["HSET", emailsKey(code), record.team, JSON.stringify(record)]);
      // The emails never outlive the session: they expire when it does.
      const remaining = Number(await redis(["TTL", sessionKey(code)]));
      // TTL -2 means the session was deleted meanwhile: do not leave orphan emails behind.
      if (remaining === SESSION_MISSING_TTL) { await redis(["DEL", emailsKey(code)]); return; }
      await redis(["EXPIRE", emailsKey(code), remaining > 0 ? remaining : SESSION_TTL_SECONDS]);
    },
    async count(code) { return Number(await redis(["HLEN", emailsKey(code)])) || 0; },
    async list(code) {
      const stored = Object.values(toRecord((await redis(["HGETALL", emailsKey(code)])) as string[]));
      return stored.map(parseStoredConsent).filter((record): record is ConsentRecord => record !== null);
    },
    async clear(code) { await redis(["DEL", emailsKey(code)]); },
  };
}
