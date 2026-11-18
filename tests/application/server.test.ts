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
    assert.deepEqual(sessions.records.AAAAA, { name: "Taller", closed: false, adminKey: "ab".repeat(12), unlocked: 0, attemptLimit: 2 });
    assert.deepEqual(await sessionUseCases.createSession("   "), { ok: false, error: "missing-name" });
  });

  it("takes the attempt limit from the facilitator and rejects a limit out of range", async () => {
    const { sessionUseCases, sessions } = setup();
    assert.deepEqual(await sessionUseCases.createSession("Taller", 5), { ok: true, code: "AAAAA", adminKey: "ab".repeat(12), name: "Taller" });
    assert.equal(sessions.records.AAAAA.attemptLimit, 5);
    for (const invalid of [0, 6, 1.5, "2", NaN]) assert.deepEqual(await sessionUseCases.createSession("Taller", invalid), { ok: false, error: "invalid-attempts" });
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
    assert.deepEqual(await sessionUseCases.findSession(" aaaaa "), { ok: true, session: { code: "AAAAA", name: "Taller", closed: false, unlocked: 0, attemptLimit: 2 } });
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

    assert.deepEqual(await act({ key: created.adminKey, action: "attempts", attempts: 9 }), { ok: false, error: "invalid-attempts" });

    assert.deepEqual(await act({ key: created.adminKey, action: "unlock", level: 3 }), { ok: true });
    assert.equal(sessions.records.AAAAA.unlocked, 3);
    assert.deepEqual(await act({ key: "wrong", action: "attempts", attempts: 4 }), { ok: false, error: "invalid-key" });
    assert.deepEqual(await act({ key: created.adminKey, action: "attempts", attempts: 4 }), { ok: true });
    assert.equal(sessions.records.AAAAA.attemptLimit, 4);
    await act({ key: created.adminKey, action: "close" });
    assert.equal(sessions.records.AAAAA.closed, true);
    await act({ key: created.adminKey, action: "reset" });
    assert.deepEqual(scores.cleared, ["AAAAA"]);
    await act({ key: created.adminKey, action: "delete" });
    assert.equal(sessions.records.AAAAA, undefined);
  });
});

describe("facilitator attempts on a legacy session", () => {
  it("refuses the attempts action when the session has no limit", async () => {
    const { sessionUseCases, sessions } = setup();
    const created = await sessionUseCases.createSession("Taller");
    assert.ok(created.ok);
    sessions.records.AAAAA.attemptLimit = null;
    assert.deepEqual(await sessionUseCases.runFacilitatorAction("AAAAA", { key: created.adminKey, action: "attempts", attempts: 3 }), { ok: false, error: "invalid-action" });
    assert.equal(sessions.records.AAAAA.attemptLimit, null);
  });
});

describe("score use cases", () => {
  const submission = { session: "aaaaa", team: "Bits", game: "nivel-1", score: 200, avatar: 2, tags: ["x"] };
  const attempt = { session: "aaaaa", team: "Bits", game: "nivel-1" };

  it("records the best score of every team and counts mistakes", async () => {
    const { sessionUseCases, scoreUseCases } = setup();
    await sessionUseCases.createSession("Taller");
    await scoreUseCases.startAttempt(attempt);
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
    await scoreUseCases.startAttempt(attempt);
    await scoreUseCases.submitScore({ ...submission, score: 120, tags: ["x", "y"] });

    const ranking = await scoreUseCases.getRanking("AAAAA");
    assert.ok(ranking.ok);
    assert.deepEqual(ranking.teams, [{ team: "Bits", total: 200, games: { "nivel-1": 200 }, avatar: 2, base: 200, bonus: { arrival: 0, perfect: 0 }, bonuses: {} }]);
    const stats = await scoreUseCases.getStats("AAAAA");
    assert.ok(stats.ok);
    assert.deepEqual(stats.stats, { plays: { "nivel-1": 2 }, tags: [{ game: "nivel-1", tag: "x", count: 2 }, { game: "nivel-1", tag: "y", count: 1 }] });
  });

  it("rejects scores for unknown or closed sessions and invalid data", async () => {
    const { sessionUseCases, scoreUseCases, sessions } = setup();
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "session-not-found" });
    assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: false, error: "session-not-found" });
    await sessionUseCases.createSession("Taller");
    assert.deepEqual(await scoreUseCases.submitScore({ ...submission, score: 9999 }), { ok: false, error: "invalid-data" });
    assert.deepEqual(await scoreUseCases.startAttempt({ ...attempt, game: "nivel-99" }), { ok: false, error: "invalid-data" });
    assert.deepEqual(await scoreUseCases.startAttempt({ ...attempt, team: "a::b" }), { ok: false, error: "invalid-data" });
    sessions.records.AAAAA.closed = true;
    assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "session-closed" });
    assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: false, error: "session-closed" });
    assert.deepEqual(await scoreUseCases.getRanking("ZZZZZ"), { ok: false, error: "session-not-found" });
    assert.deepEqual(await scoreUseCases.getStats(""), { ok: false, error: "session-not-found" });
  });

  describe("attempt limit", () => {
    async function openSession(attempts?: number) {
      const context = setup();
      const created = await context.sessionUseCases.createSession("Taller", attempts);
      assert.ok(created.ok);
      return { ...context, adminKey: created.adminKey };
    }

    it("counts attempts as they start and refuses the one over the limit", async () => {
      const { scoreUseCases, scores } = await openSession();
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: true, attempt: 1, limit: 2 });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: true, attempt: 2, limit: 2 });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: false, error: "attempts-exhausted" });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: false, error: "attempts-exhausted" });
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "started"), 2);
      assert.deepEqual(await scoreUseCases.startAttempt({ ...attempt, game: "nivel-2" }), { ok: true, attempt: 1, limit: 2 });
      assert.deepEqual(await scoreUseCases.startAttempt({ ...attempt, team: "Bytes" }), { ok: true, attempt: 1, limit: 2 });
    });

    it("lets the next start in when the facilitator raises the limit, keeping the spent attempts", async () => {
      const { scoreUseCases, sessionUseCases, adminKey } = await openSession();
      await scoreUseCases.startAttempt(attempt);
      await scoreUseCases.startAttempt(attempt);
      assert.equal((await scoreUseCases.startAttempt(attempt)).ok, false);
      await sessionUseCases.runFacilitatorAction("AAAAA", { key: adminKey, action: "attempts", attempts: 3 });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: true, attempt: 3, limit: 3 });
      await sessionUseCases.runFacilitatorAction("AAAAA", { key: adminKey, action: "attempts", attempts: 1 });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: false, error: "attempts-exhausted" });
    });

    it("keeps the best score of the attempts allowed", async () => {
      const { scoreUseCases } = await openSession();
      await scoreUseCases.startAttempt(attempt);
      await scoreUseCases.submitScore({ ...submission, score: 250 });
      await scoreUseCases.startAttempt(attempt);
      await scoreUseCases.submitScore({ ...submission, score: 180 });
      const ranking = await scoreUseCases.getRanking("AAAAA");
      assert.ok(ranking.ok);
      assert.equal(ranking.teams[0].games["nivel-1"], 250);
    });

    it("refuses a score that has no started attempt behind it", async () => {
      const { scoreUseCases, scores } = await openSession();
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "no-attempt" });
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 0);
      assert.deepEqual((await scoreUseCases.getRanking("AAAAA") as { teams: unknown[] }).teams, []);
    });

    it("refuses the second score sent for one started attempt", async () => {
      const { scoreUseCases } = await openSession();
      await scoreUseCases.startAttempt(attempt);
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
      assert.deepEqual(await scoreUseCases.submitScore({ ...submission, score: 300 }), { ok: false, error: "no-attempt" });
      const stats = await scoreUseCases.getStats("AAAAA");
      assert.ok(stats.ok);
      assert.deepEqual(stats.stats.plays, { "nivel-1": 1 });
    });

    it("refuses a score over the attempt limit even if the started counter was bumped past it", async () => {
      const { scoreUseCases, scores, sessionUseCases, adminKey } = await openSession(1);
      await sessionUseCases.runFacilitatorAction("AAAAA", { key: adminKey, action: "attempts", attempts: 1 });
      await scores.bumpAttempt("AAAAA", "Bits", "nivel-1", "started", 1);
      await scores.bumpAttempt("AAAAA", "Bits", "nivel-1", "started", 1);
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: false, error: "no-attempt" });
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 1);
    });

    it("gives the scored attempt back when recording fails, and a retry works", async () => {
      const { scoreUseCases, scores } = await openSession();
      await scoreUseCases.startAttempt(attempt);
      const record = scores.record;
      scores.record = async () => { throw new Error("redis down"); };
      await assert.rejects(scoreUseCases.submitScore({ ...submission, score: 300 }), /redis down/);
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 0);
      assert.deepEqual((await scoreUseCases.getRanking("AAAAA") as { teams: unknown[] }).teams, []);
      scores.record = record;
      assert.deepEqual(await scoreUseCases.submitScore({ ...submission, score: 300 }), { ok: true });
      const ranking = await scoreUseCases.getRanking("AAAAA");
      assert.ok(ranking.ok);
      assert.equal(ranking.teams[0].games["nivel-1"], 300);
      assert.equal(ranking.teams[0].bonus.perfect, 30);
    });

    it("applies no limit to sessions created before the limit existed", async () => {
      const { scoreUseCases, sessions, scores } = await openSession();
      sessions.records.AAAAA.attemptLimit = null;
      for (let play = 0; play < 4; play++) assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: true, attempt: null, limit: null });
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
      assert.deepEqual(await scoreUseCases.submitScore(submission), { ok: true });
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "started"), 0);
      assert.equal(await scores.attemptCount("AAAAA", "Bits", "nivel-1", "scored"), 0);
    });

    it("gives the attempts back when the scores are reset", async () => {
      const { scoreUseCases, sessionUseCases, adminKey } = await openSession();
      await scoreUseCases.startAttempt(attempt);
      await scoreUseCases.startAttempt(attempt);
      await sessionUseCases.runFacilitatorAction("AAAAA", { key: adminKey, action: "reset" });
      assert.deepEqual(await scoreUseCases.startAttempt(attempt), { ok: true, attempt: 1, limit: 2 });
    });
  });

  describe("speed bonus", () => {
    const play = async (scoreUseCases: ReturnType<typeof setup>["scoreUseCases"], team: string, score: number, game = "nivel-1") => {
      await scoreUseCases.startAttempt({ session: "AAAAA", team, game });
      return scoreUseCases.submitScore({ session: "AAAAA", team, game, score, avatar: 0, tags: [] });
    };
    const rowsOf = async (scoreUseCases: ReturnType<typeof setup>["scoreUseCases"]) => {
      const ranking = await scoreUseCases.getRanking("AAAAA");
      assert.ok(ranking.ok);
      return Object.fromEntries(ranking.teams.map((row) => [row.team, row]));
    };

    it("gives 45, 30 and 15 to the first three teams to reach 240, and nothing to the fourth", async () => {
      const { sessionUseCases, scoreUseCases } = setup();
      await sessionUseCases.createSession("Taller");
      await play(scoreUseCases, "A", 240);
      await play(scoreUseCases, "B", 270);
      await play(scoreUseCases, "C", 250);
      await play(scoreUseCases, "D", 260);
      const rows = await rowsOf(scoreUseCases);
      assert.deepEqual(["A", "B", "C", "D"].map((team) => rows[team].bonus.arrival), [45, 30, 15, 0]);
      assert.deepEqual(["A", "B", "C", "D"].map((team) => rows[team].total), [285, 300, 265, 260]);
      assert.deepEqual(rows.A.games, { "nivel-1": 240 });
    });

    it("gives no bonus and no place to a result under 240", async () => {
      const { sessionUseCases, scoreUseCases } = setup();
      await sessionUseCases.createSession("Taller");
      await play(scoreUseCases, "A", 239);
      await play(scoreUseCases, "B", 240);
      const rows = await rowsOf(scoreUseCases);
      assert.deepEqual(rows.A.bonuses, {});
      assert.equal(rows.B.bonus.arrival, 45);
    });

    it("gives the first perfect score the extra bonus once", async () => {
      const { sessionUseCases, scoreUseCases } = setup();
      await sessionUseCases.createSession("Taller");
      await play(scoreUseCases, "A", 300);
      await play(scoreUseCases, "B", 300);
      const rows = await rowsOf(scoreUseCases);
      assert.deepEqual(rows.A.bonuses["nivel-1"], { place: 1, arrival: 45, perfect: 30 });
      assert.deepEqual(rows.B.bonuses["nivel-1"], { place: 2, arrival: 30, perfect: 0 });
      assert.equal(rows.A.total, 375);
    });

    it("keeps a bonus when the team improves later, and does not hand out a second one", async () => {
      const { sessionUseCases, scoreUseCases } = setup();
      await sessionUseCases.createSession("Taller", 3);
      await play(scoreUseCases, "A", 240);
      await play(scoreUseCases, "B", 250);
      await play(scoreUseCases, "A", 280);
      await play(scoreUseCases, "A", 300);
      const rows = await rowsOf(scoreUseCases);
      assert.deepEqual(rows.A.bonuses["nivel-1"], { place: 1, arrival: 45, perfect: 30 });
      assert.deepEqual(rows.B.bonuses["nivel-1"], { place: 2, arrival: 30, perfect: 0 });
    });

    it("orders equal totals by who finished first", async () => {
      const { sessionUseCases, scoreUseCases } = setup();
      await sessionUseCases.createSession("Taller");
      await play(scoreUseCases, "Late", 100);
      await play(scoreUseCases, "Early", 100);
      await play(scoreUseCases, "Late", 100, "nivel-2");
      await play(scoreUseCases, "Early", 100, "nivel-2");
      const ranking = await scoreUseCases.getRanking("AAAAA");
      assert.ok(ranking.ok);
      assert.deepEqual(ranking.teams.map((row) => row.team), ["Late", "Early"]);
    });

    it("never stamps or awards anything in sessions created before the limit existed", async () => {
      const { sessionUseCases, scoreUseCases, sessions, scores } = setup();
      await sessionUseCases.createSession("Taller");
      sessions.records.AAAAA.attemptLimit = null;
      await play(scoreUseCases, "A", 300);
      const rows = await rowsOf(scoreUseCases);
      assert.deepEqual(rows.A.bonuses, {});
      assert.equal(rows.A.total, 300);
      assert.deepEqual(await scores.arrivals("AAAAA"), []);
    });

    it("forgets the arrivals when the scores are reset", async () => {
      const { sessionUseCases, scoreUseCases, scores } = setup();
      const created = await sessionUseCases.createSession("Taller");
      assert.ok(created.ok);
      await play(scoreUseCases, "A", 300);
      await sessionUseCases.runFacilitatorAction("AAAAA", { key: created.adminKey, action: "reset" });
      assert.deepEqual(await scores.arrivals("AAAAA"), []);
      await play(scoreUseCases, "B", 250);
      assert.equal((await rowsOf(scoreUseCases)).B.bonus.arrival, 45);
    });
  });
});
