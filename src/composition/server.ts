import { createScoreUseCases } from "../application/server/score-use-cases";
import { createSessionUseCases } from "../application/server/session-use-cases";
import { createMemoryScoreRepository, createMemorySessionRepository } from "../infrastructure/server/memory-repositories";
import { nodeRandom } from "../infrastructure/server/node-random";
import { createUpstashScoreRepository, createUpstashSessionRepository } from "../infrastructure/server/upstash-repositories";
import { createRedisCommand } from "../infrastructure/server/upstash-redis";

/**
 * Server composition root: the only place that knows which adapters back the ports.
 * With Upstash credentials the data is persistent; without them everything lives in memory.
 */
const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;

export const storageIsPersistent = Boolean(url && token);

const redis = storageIsPersistent ? createRedisCommand(url!, token!) : null;
const sessions = redis ? createUpstashSessionRepository(redis) : createMemorySessionRepository();
const scores = redis ? createUpstashScoreRepository(redis) : createMemoryScoreRepository();

export const sessionUseCases = createSessionUseCases({ sessions, scores, random: nodeRandom });
export const scoreUseCases = createScoreUseCases({ sessions, scores });
