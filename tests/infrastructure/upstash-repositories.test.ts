import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { SESSION_TTL_SECONDS } from "../../src/domain/session/session";
import { createScoreUseCases } from "../../src/application/server/score-use-cases";
import { fakeSessionRepository } from "../support/fakes";
import { createUpstashEmailRepository, createUpstashScoreRepository, createUpstashSessionRepository } from "../../src/infrastructure/server/upstash-repositories";
import type { RedisCommand } from "../../src/infrastructure/server/upstash-redis";

/** The few Redis commands the repositories use, over plain maps. Records the commands it receives. */
function fakeRedis(initial: Record<string, Record<string, string>> = {}) {
  const hashes = new Map(Object.entries(initial).map(([key, hash]) => [key, new Map(Object.entries(hash))]));
  const strings = new Map<string, number>();
  const ttls = new Map<string, number>();
  const commands: (string | number)[][] = [];
  const hash = (key: string | number) => hashes.get(String(key)) ?? hashes.set(String(key), new Map()).get(String(key))!;
  const redis: RedisCommand = async (command) => {
    commands.push(command);
    const [name, key, ...args] = command;
    switch (name) {
      case "HSET": for (let i = 0; i < args.length; i += 2) hash(key).set(String(args[i]), String(args[i + 1])); return args.length / 2;
      case "HSETNX": if (hash(key).has(String(args[0]))) return 0; hash(key).set(String(args[0]), String(args[1])); return 1;
      case "HGET": return hash(key).get(String(args[0])) ?? null;
      case "HMGET": return args.map((field) => hash(key).get(String(field)) ?? null);
      case "HGETALL": return [...hash(key)].flat();
      case "HINCRBY": { const value = Number(hash(key).get(String(args[0])) ?? 0) + Number(args[1]); hash(key).set(String(args[0]), String(value)); return value; }
      case "INCR": { const value = (strings.get(String(key)) ?? 0) + 1; strings.set(String(key), value); return value; }
      case "DEL": hashes.delete(String(key)); strings.delete(String(key)); return 1;
      case "HLEN": return hash(key).size;
      case "TTL": return ttls.get(String(key)) ?? -1;
      case "EXPIRE": ttls.set(String(key), Number(args[0])); return 1;
      default: throw new Error(`unexpected command ${name}`);
    }
  };
  return { redis, commands, hashes, ttls };
}

const NO_ATTEMPT_LIMIT_FIELDS = { name: "Miércoles", closed: "0", adminKey: "k", unlocked: "2" };

describe("upstash session repository", () => {
  it("reads a session hash written before the attempt limit existed as having no limit", async () => {
    const { redis } = fakeRedis({ "aq:session:OLD01": NO_ATTEMPT_LIMIT_FIELDS });
    const found = await createUpstashSessionRepository(redis).find("OLD01");
    assert.deepEqual(found, { name: "Miércoles", closed: false, adminKey: "k", unlocked: 2, attemptLimit: null, collectEmails: false });
  });

  it("stores the attempt limit of a new session, and reads it back after it changes", async () => {
    const { redis } = fakeRedis();
    const sessions = createUpstashSessionRepository(redis);
    assert.equal(await sessions.create("NEW01", { name: "Taller", closed: false, adminKey: "k", unlocked: 0, attemptLimit: 2, collectEmails: false }), true);
    assert.equal((await sessions.find("NEW01"))?.attemptLimit, 2);
    await sessions.setAttemptLimit("NEW01", 4);
    assert.equal((await sessions.find("NEW01"))?.attemptLimit, 4);
  });

  it("writes no attempts field when the session has no limit", async () => {
    const { redis, hashes } = fakeRedis();
    await createUpstashSessionRepository(redis).create("LEG01", { name: "Taller", closed: false, adminKey: "k", unlocked: 0, attemptLimit: null, collectEmails: false });
    assert.equal(hashes.get("aq:session:LEG01")?.has("attempts"), false);
  });

  it("ignores a stored limit that is not valid", async () => {
    const { redis } = fakeRedis({ "aq:session:BAD01": { ...NO_ATTEMPT_LIMIT_FIELDS, attempts: "abc" } });
    assert.equal((await createUpstashSessionRepository(redis).find("BAD01"))?.attemptLimit, null);
  });
});

describe("upstash session repository and emails", () => {
  it("reads a session hash without the emails field as not collecting", async () => {
    const { redis } = fakeRedis({ "aq:session:OLD01": NO_ATTEMPT_LIMIT_FIELDS });
    assert.equal((await createUpstashSessionRepository(redis).find("OLD01"))?.collectEmails, false);
  });

  it("writes the emails field on create and changes it with setCollectEmails", async () => {
    const { redis, hashes } = fakeRedis();
    const sessions = createUpstashSessionRepository(redis);
    await sessions.create("NEW01", { name: "Taller", closed: false, adminKey: "k", unlocked: 0, attemptLimit: 2, collectEmails: true });
    assert.equal(hashes.get("aq:session:NEW01")?.get("emails"), "1");
    assert.equal((await sessions.find("NEW01"))?.collectEmails, true);
    await sessions.setCollectEmails("NEW01", false);
    assert.equal(hashes.get("aq:session:NEW01")?.get("emails"), "0");
    assert.equal((await sessions.find("NEW01"))?.collectEmails, false);
  });
});

describe("upstash email repository", () => {
  const record = { team: "Los|Bits", email: "a@x.es", consentedAt: "2026-11-22T10:00:00.000Z", version: "v1" };

  it("keeps one record per team and counts them", async () => {
    const { redis } = fakeRedis();
    const emails = createUpstashEmailRepository(redis);
    await emails.save("AAAAA", record);
    await emails.save("AAAAA", { ...record, email: "b@x.es" });
    await emails.save("AAAAA", { ...record, team: "Bytes" });
    assert.equal(await emails.count("AAAAA"), 2);
    assert.deepEqual((await emails.list("AAAAA")).map((entry) => entry.email).sort(), ["b@x.es", "a@x.es"].sort());
    assert.equal(await emails.count("OTHER"), 0);
  });

  it("expires with the remaining life of the session, or a full life when it cannot be read", async () => {
    const { redis, ttls } = fakeRedis();
    const emails = createUpstashEmailRepository(redis);
    ttls.set("aq:session:AAAAA", 1234);
    await emails.save("AAAAA", record);
    assert.equal(ttls.get("aq:emails:AAAAA"), 1234);
    await emails.save("BBBBB", record);
    assert.equal(ttls.get("aq:emails:BBBBB"), SESSION_TTL_SECONDS);
  });

  it("drops the emails when the session was deleted while saving", async () => {
    const { redis, hashes } = fakeRedis();
    const sessionGone: typeof redis = async (command) => (command[0] === "TTL" ? -2 : redis(command));
    const emails = createUpstashEmailRepository(sessionGone);
    await emails.save("AAAAA", record);
    assert.equal(hashes.has("aq:emails:AAAAA"), false);
  });

  it("skips corrupt stored records and clears the key", async () => {
    const { redis, hashes } = fakeRedis({ "aq:emails:AAAAA": { Bad: "{not json", Wrong: "{\"team\":1}", Null: "null" } });
    const emails = createUpstashEmailRepository(redis);
    await emails.save("AAAAA", record);
    assert.deepEqual(await emails.list("AAAAA"), [record]);
    await emails.clear("AAAAA");
    assert.equal(hashes.has("aq:emails:AAAAA"), false);
    assert.deepEqual(await emails.list("AAAAA"), []);
  });
});

describe("upstash score repository", () => {
  const submission = { team: "Los|Bits", game: "nivel-1", score: 250, avatar: 1, tags: [] };

  it("keeps the first arrival stamp and reads the stamps back, even for a team name with a pipe", async () => {
    const { redis } = fakeRedis();
    const scores = createUpstashScoreRepository(redis);
    await scores.stampFirst("AAAAA", "Los|Bits", "nivel-1", "qualified", 3);
    await scores.stampFirst("AAAAA", "Los|Bits", "nivel-1", "qualified", 9);
    await scores.record("AAAAA", submission, 4);
    assert.deepEqual((await scores.arrivals("AAAAA")).sort((a, b) => a.sequence - b.sequence), [
      { team: "Los|Bits", game: "nivel-1", mark: "qualified", sequence: 3 },
      { team: "Los|Bits", game: "nivel-1", mark: "best", sequence: 4 },
    ]);
  });

  it("stamps the best arrival only when the best score improves", async () => {
    const { redis } = fakeRedis();
    const scores = createUpstashScoreRepository(redis);
    await scores.record("AAAAA", submission, 1);
    await scores.record("AAAAA", { ...submission, score: 100 }, 2);
    await scores.record("AAAAA", { ...submission, score: 300 }, 3);
    assert.deepEqual((await scores.arrivals("AAAAA")).map((entry) => entry.sequence), [3]);
  });

  it("counts attempts and sequence numbers, and clear removes them", async () => {
    const { redis, hashes } = fakeRedis();
    const scores = createUpstashScoreRepository(redis);
    assert.equal(await scores.bumpAttempt("AAAAA", "Bits", "nivel-1", "started", 1), 1);
    assert.equal(await scores.bumpAttempt("AAAAA", "Bits", "nivel-1", "started", 1), 2);
    assert.equal(await scores.bumpAttempt("AAAAA", "Bits", "nivel-1", "started", -1), 1);
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "started"), 1);
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 0);
    assert.deepEqual([await scores.nextSequence("AAAAA"), await scores.nextSequence("AAAAA")], [1, 2]);
    await scores.clear("AAAAA");
    assert.equal(hashes.has("aq:attempts:AAAAA"), false);
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "started"), 0);
    assert.equal(await scores.nextSequence("AAAAA"), 1);
  });
});

describe("upstash attempt counts", () => {
  it("reads the counters of several games with one read-only command", async () => {
    const { redis, commands } = fakeRedis();
    const scores = createUpstashScoreRepository(redis);
    await scores.bumpAttempt("AAAAA", "Los|Bits", "nivel-2", "started", 1);
    await scores.bumpAttempt("AAAAA", "Los|Bits", "nivel-2", "started", 1);
    commands.length = 0;
    assert.deepEqual(await scores.attemptCounts("AAAAA", "Los|Bits", ["nivel-1", "nivel-2"], "started"), { "nivel-1": 0, "nivel-2": 2 });
    assert.deepEqual(commands.map((command) => command[0]), ["HMGET"]);
  });
});

describe("score use cases over Upstash", () => {
  it("undoes the scored counter when Redis fails while recording, and a retry succeeds", async () => {
    const { redis, hashes } = fakeRedis();
    let failing = true;
    const flaky: RedisCommand = async (command) => {
      if (failing && command[0] === "HSET" && String(command[1]).includes("scores")) throw new Error("upstash down");
      return redis(command);
    };
    const sessions = fakeSessionRepository();
    await sessions.create("AAAAA", { name: "Taller", closed: false, adminKey: "k", unlocked: 0, attemptLimit: 2, collectEmails: false });
    const scores = createUpstashScoreRepository(flaky);
    const useCases = createScoreUseCases({ sessions, scores });
    const play = { session: "AAAAA", team: "Bits", game: "nivel-1", score: 300, avatar: 1, tags: [] };
    await useCases.startAttempt(play);
    await assert.rejects(useCases.submitScore(play), /upstash down/);
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 0);
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "started"), 1);
    failing = false;
    assert.deepEqual(await useCases.submitScore(play), { ok: true });
    assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 1);
    assert.ok(hashes.size > 0);
  });
});
