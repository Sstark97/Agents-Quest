import type { ScoreRepository, SessionRepository } from "../../application/server/ports";
import { SESSION_TTL_SECONDS } from "../../domain/session/session";
import { counterFields, parseCounterField, parseScoreField, scoreField } from "./storage-schema";
import { toRecord, type RedisCommand } from "./upstash-redis";

const sessionKey = (code: string) => `aq:session:${code}`;
const scoresKey = (code: string) => `aq:scores:${code}`;
const avatarsKey = (code: string) => `aq:avatars:${code}`;
const statsKey = (code: string) => `aq:stats:${code}`;

export function createUpstashSessionRepository(redis: RedisCommand): SessionRepository {
  return {
    async create(code, session) {
      if ((await redis(["HSETNX", sessionKey(code), "adminKey", session.adminKey])) !== 1) return false;
      await redis(["HSET", sessionKey(code), "name", session.name, "closed", session.closed ? "1" : "0", "unlocked", String(session.unlocked)]);
      await redis(["EXPIRE", sessionKey(code), SESSION_TTL_SECONDS]);
      return true;
    },
    async find(code) {
      const fields = toRecord((await redis(["HGETALL", sessionKey(code)])) as string[]);
      return fields.name ? { name: fields.name, closed: fields.closed === "1", adminKey: fields.adminKey, unlocked: Number(fields.unlocked) || 0 } : null;
    },
    async setClosed(code, closed) { await redis(["HSET", sessionKey(code), "closed", closed ? "1" : "0"]); },
    async setUnlocked(code, levels) { await redis(["HSET", sessionKey(code), "unlocked", levels]); },
    async delete(code) { await redis(["DEL", sessionKey(code)]); },
  };
}

export function createUpstashScoreRepository(redis: RedisCommand): ScoreRepository {
  const numbers = async (key: string) => Object.entries(toRecord((await redis(["HGETALL", key])) as string[])).map(([field, value]) => [field, Number(value)] as const);

  return {
    async record(code, submission) {
      const field = scoreField(submission.team, submission.game);
      const previous = Number(await redis(["HGET", scoresKey(code), field])) || 0;
      if (submission.score > previous) {
        await redis(["HSET", scoresKey(code), field, submission.score]);
        await redis(["EXPIRE", scoresKey(code), SESSION_TTL_SECONDS]);
      }
      await redis(["HSET", avatarsKey(code), submission.team, submission.avatar]);
      await redis(["EXPIRE", avatarsKey(code), SESSION_TTL_SECONDS]);
      for (const counter of counterFields(submission)) await redis(["HINCRBY", statsKey(code), counter, 1]);
      await redis(["EXPIRE", statsKey(code), SESSION_TTL_SECONDS]);
    },
    async bestScores(code) { return (await numbers(scoresKey(code))).map(([field, score]) => parseScoreField(field, score)); },
    async avatars(code) { return Object.fromEntries(await numbers(avatarsKey(code))); },
    async counters(code) { return (await numbers(statsKey(code))).map(([field, count]) => parseCounterField(field, count)); },
    async clear(code) { for (const key of [scoresKey(code), avatarsKey(code), statsKey(code)]) await redis(["DEL", key]); },
  };
}
