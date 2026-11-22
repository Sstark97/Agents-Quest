import { createEmailUseCases } from "../application/server/email-use-cases";
import { createScoreUseCases } from "../application/server/score-use-cases";
import { createSessionUseCases } from "../application/server/session-use-cases";
import { createMemoryEmailRepository, createMemoryScoreRepository, createMemorySessionRepository } from "../infrastructure/server/memory-repositories";
import { nodeRandom } from "../infrastructure/server/node-random";
import { createUpstashEmailRepository, createUpstashScoreRepository, createUpstashSessionRepository } from "../infrastructure/server/upstash-repositories";
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
const emails = redis ? createUpstashEmailRepository(redis) : createMemoryEmailRepository();
const scores = redis ? createUpstashScoreRepository(redis) : createMemoryScoreRepository();

export const sessionUseCases = createSessionUseCases({ sessions, scores, emails, random: nodeRandom });
export const scoreUseCases = createScoreUseCases({ sessions, scores });
export const emailUseCases = createEmailUseCases({ sessions, emails, now: () => new Date() });
