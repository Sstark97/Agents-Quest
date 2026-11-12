import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAMES } from "../../src/domain/games/catalog";
import { earnedMedals } from "../../src/domain/games/medal-rules";
import { currentLevelIndex, isPassed, levelStates, passScore } from "../../src/domain/games/progress";
import { buildRanking } from "../../src/domain/session/ranking";
import { parseScoreSubmission } from "../../src/domain/session/score-submission";
import { normalizeSessionCode, sanitizeSessionName, sessionCodeFromBytes } from "../../src/domain/session/session";
import { buildStats, shareOfPlays, summarizeLevel } from "../../src/domain/session/stats";
import { hash, seedOrder, teamSeed } from "../../src/domain/shared/seed";

describe("progress", () => {
  it("passes a level with 60 % of its maximum score", () => {
    assert.equal(passScore(GAMES[0]), 180);
    assert.equal(isPassed(GAMES[0], { "nivel-1": 179 }), false);
    assert.equal(isPassed(GAMES[0], { "nivel-1": 180 }), true);
  });

  it("locks the levels the facilitator has not opened", () => {
    assert.deepEqual(levelStates({ "nivel-1": 300 }, 2).slice(0, 3), ["done", "open", "locked"]);
  });

  it("places a team on its first pending level, never beyond the last open one", () => {
    assert.equal(currentLevelIndex({}, 0), 0);
    assert.equal(currentLevelIndex({ "nivel-1": 300, "nivel-2": 300 }, 2), 1);
    assert.equal(currentLevelIndex({ "nivel-1": 300 }, 3), 1);
    assert.equal(currentLevelIndex(Object.fromEntries(GAMES.map((game) => [game.id, game.maxScore])), GAMES.length), GAMES.length);
  });

  it("awards the generic medals", () => {
    assert.deepEqual(earnedMedals({ levelMedals: ["frugal"], points: 300, maxPoints: 300, passed: true, attempt: 1 }), ["frugal", "pleno", "primero"]);
    assert.deepEqual(earnedMedals({ levelMedals: [], points: 200, maxPoints: 300, passed: true, attempt: 2 }), []);
  });
});

describe("session", () => {
  it("normalises codes typed by hand", () => {
    assert.equal(normalizeSessionCode("  k7-m2q "), "K7M2Q");
    assert.equal(normalizeSessionCode("abcdefghijkl"), "ABCDEFGH");
  });

  it("builds readable codes: no 0, O, 1 or I", () => {
    const code = sessionCodeFromBytes(Uint8Array.from({ length: 256 }, (_, byte) => byte));
    assert.doesNotMatch(code, /[0O1I]/);
    assert.equal(sessionCodeFromBytes(Uint8Array.from([0, 1, 31, 32, 33])), "ABXAB".replace("X", "9"));
  });

  it("trims and caps the session name", () => {
    assert.equal(sanitizeSessionName(`  ${"x".repeat(60)}  `).length, 40);
    assert.equal(sanitizeSessionName(42), "");
  });
});

describe("score submission", () => {
  const valid = { team: " Los Bits ", game: "nivel-1", score: 250, avatar: 3, tags: [" a ", "a", "", 7, "b"] };

  it("cleans a valid submission", () => {
    assert.deepEqual(parseScoreSubmission(valid), { team: "Los Bits", game: "nivel-1", score: 250, avatar: 3, tags: ["a", "b"] });
    assert.equal(parseScoreSubmission({ ...valid, avatar: 99 })?.avatar, 0);
  });

  it("rejects what cannot be a real score", () => {
    assert.equal(parseScoreSubmission(null), null);
    assert.equal(parseScoreSubmission({ ...valid, team: "  " }), null);
    assert.equal(parseScoreSubmission({ ...valid, team: "a::b" }), null);
    assert.equal(parseScoreSubmission({ ...valid, game: "nivel-99" }), null);
    assert.equal(parseScoreSubmission({ ...valid, score: 301 }), null);
    assert.equal(parseScoreSubmission({ ...valid, score: -1 }), null);
    assert.equal(parseScoreSubmission({ ...valid, score: 10.5 }), null);
  });
});

describe("ranking and stats", () => {
  it("adds up the best scores per team, highest total first", () => {
    const teams = buildRanking(
      [{ team: "A", game: "nivel-1", score: 100 }, { team: "B", game: "nivel-1", score: 250 }, { team: "A", game: "nivel-2", score: 200 }, { team: "A", game: "old-game", score: 999 }],
      { B: 5 },
    );
    assert.deepEqual(teams, [
      { team: "A", total: 300, games: { "nivel-1": 100, "nivel-2": 200 }, avatar: 0 },
      { team: "B", total: 250, games: { "nivel-1": 250 }, avatar: 5 },
    ]);
  });

  it("separates plays from mistakes and summarises a level", () => {
    const stats = buildStats([
      { game: "nivel-1", tag: "_plays", count: 4 }, { game: "nivel-1", tag: "x", count: 1 }, { game: "nivel-1", tag: "y", count: 3 }, { game: "other", tag: "z", count: 9 },
    ]);
    assert.deepEqual(stats.plays, { "nivel-1": 4 });
    assert.deepEqual(stats.tags.map((counter) => counter.tag), ["y", "x"]);
    assert.equal(shareOfPlays(3, 4), 75);
    assert.deepEqual(summarizeLevel(GAMES[0], stats, [{ games: { "nivel-1": 300 } }, { games: { "nivel-1": 100 } }, { games: {} }]), {
      plays: 4, topMistakes: stats.tags, teamsPlayed: 2, teamsPassed: 1, averageScore: 200,
    });
  });
});

describe("seed", () => {
  it("is deterministic per team and session", () => {
    assert.equal(teamSeed("Bits", undefined), "Bits:");
    assert.equal(hash(teamSeed("Bits", "K7M2Q")), hash("Bits:K7M2Q"));
    const items = [1, 2, 3, 4, 5, 6];
    assert.deepEqual(seedOrder(items, "a"), seedOrder(items, "a"));
    assert.deepEqual([...seedOrder(items, "a")].sort(), items);
  });
});
