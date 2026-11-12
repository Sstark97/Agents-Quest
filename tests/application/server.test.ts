import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createScoreUseCases } from "../../src/application/server/score-use-cases";
import { createSessionUseCases } from "../../src/application/server/session-use-cases";
import { fakeRandom, fakeScoreRepository, fakeSessionRepository } from "../support/fakes";

function setup(...randomSequences: number[][]) {
  const sessions = fakeSessionRepository();
  const scores = fakeScoreRepository();
  return {
    sessions, scores,
    sessionUseCases: createSessionUseCases({ sessions, scores, random: fakeRandom(...randomSequences) }),
    scoreUseCases: createScoreUseCases({ sessions, scores }),
  };
}

describe("session use cases", () => {
  it("creates a session with a code for the teams and a key for the facilitator", async () => {
    const { sessionUseCases, sessions } = setup();
    assert.deepEqual(await sessionUseCases.createSession("  Taller  "), { ok: true, code: "AAAAA", adminKey: "ab".repeat(12), name: "Taller" });
    assert.deepEqual(sessions.records.AAAAA, { name: "Taller", closed: false, adminKey: "ab".repeat(12), unlocked: 0 });
    assert.deepEqual(await sessionUseCases.createSession("   "), { ok: false, error: "missing-name" });
  });

  it("tries another code when the first one is taken", async () => {
    const { sessionUseCases } = setup([0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [1, 1, 1, 1, 1]);
    await sessionUseCases.createSession("One");
    const second = await sessionUseCases.createSession("Two");
    assert.equal(second.ok && second.code, "BBBBB");
  });

  it("never reveals the facilitator key", async () => {
    const { sessionUseCases } = setup();
    await sessionUseCases.createSession("Taller");
    assert.deepEqual(await sessionUseCases.findSession(" aaaaa "), { ok: true, session: { code: "AAAAA", name: "Taller", closed: false, unlocked: 0 } });
    assert.deepEqual(await sessionUseCases.findSession("ZZZZZ"), { ok: false, error: "session-not-found" });
  });

  it("guards the facilitator actions with the key", async () => {
    const { sessionUseCases, sessions, scores } = setup();
    const created = await sessionUseCases.createSession("Taller");
    assert.ok(created.ok);
    const act = (input: object) => sessionUseCases.runFacilitatorAction(created.code, input);

    assert.deepEqual(await act({ key: "wrong", action: "close" }), { ok: false, error: "invalid-key" });
    assert.deepEqual(await sessionUseCases.runFacilitatorAction("NOPE", { key: created.adminKey, action: "close" }), { ok: false, error: "session-not-found" });
    assert.deepEqual(await act({ key: created.adminKey, action: "explode" }), { ok: false, error: "invalid-action" });
    assert.deepEqual(await act({ key: created.adminKey, action: "unlock", level: 8 }), { ok: false, error: "invalid-level" });

    assert.deepEqual(await act({ key: created.adminKey, action: "unlock", level: 3 }), { ok: true });
    assert.equal(sessions.records.AAAAA.unlocked, 3);
    await act({ key: created.adminKey, action: "close" });
    assert.equal(sessions.records.AAAAA.closed, true);
    await act({ key: created.adminKey, action: "reset" });
    assert.deepEqual(scores.cleared, ["AAAAA"]);
    await act({ key: created.adminKey, action: "delete" });
    assert.equal(sessions.records.AAAAA, undefined);
  });
});

describe("score use cases", () => {
  const submission = { session: "aaaaa", team: "Bits", game: "nivel-1", score: 200, avatar: 2, tags: ["x"] };

  it("records the best score of every team and counts mistakes", async () => {
    const { sessionUseCases, scoreUseCases } = setup();
    await sessionUseCases.createSession("Taller");
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
    await scoreUseCases.submitScore({ ...submission, score: 120, tags: ["x", "y"] });

    const ranking = await scoreUseCases.getRanking("AAAAA");
    assert.ok(ranking.ok);
    assert.deepEqual(ranking.teams, [{ team: "Bits", total: 200, games: { "nivel-1": 200 }, avatar: 2 }]);
    const stats = await scoreUseCases.getStats("AAAAA");
    assert.ok(stats.ok);
    assert.deepEqual(stats.stats, { plays: { "nivel-1": 2 }, tags: [{ game: "nivel-1", tag: "x", count: 2 }, { game: "nivel-1", tag: "y", count: 1 }] });
  });

  it("rejects scores for unknown or closed sessions and invalid data", async () => {
    const { sessionUseCases, scoreUseCases, sessions } = setup();
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "session-not-found" });
    await sessionUseCases.createSession("Taller");
    assert.deepEqual(await scoreUseCases.submitScore({ ...submission, score: 9999 }), { ok: false, error: "invalid-data" });
    sessions.records.AAAAA.closed = true;
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "session-closed" });
    assert.deepEqual(await scoreUseCases.getRanking("ZZZZZ"), { ok: false, error: "session-not-found" });
    assert.deepEqual(await scoreUseCases.getStats(""), { ok: false, error: "session-not-found" });
  });
});
