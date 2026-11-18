import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAMES } from "../../src/domain/games/catalog";
import { earnedMedals } from "../../src/domain/games/medal-rules";
import { currentLevelIndex, isPassed, levelStates, passScore } from "../../src/domain/games/progress";
import { ARRIVAL_BONUSES, FIRST_PERFECT_BONUS, arrivalMarks, awardBonuses, bonusScore, finishedAt, type ArrivalEntry } from "../../src/domain/session/bonus";
import { buildRanking } from "../../src/domain/session/ranking";
import { parseScoreSubmission } from "../../src/domain/session/score-submission";
import { isWithinLimit, normalizeSessionCode, parseAttemptLimit, sanitizeSessionName, sessionCodeFromBytes } from "../../src/domain/session/session";
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

  it("accepts attempt limits from 1 to 5 only", () => {
    assert.deepEqual([1, 2, 5].map(parseAttemptLimit), [1, 2, 5]);
    for (const invalid of [0, 6, -1, 2.5, "2", null, undefined, NaN]) assert.equal(parseAttemptLimit(invalid), null);
  });

  it("fits the attempts used in the limit, and never limits when there is none", () => {
    assert.equal(isWithinLimit(2, 2), true);
    assert.equal(isWithinLimit(3, 2), false);
    assert.equal(isWithinLimit(1000, null), true);
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
      { team: "A", total: 300, games: { "nivel-1": 100, "nivel-2": 200 }, avatar: 0, base: 300, bonus: { arrival: 0, perfect: 0 }, bonuses: {} },
      { team: "B", total: 250, games: { "nivel-1": 250 }, avatar: 5, base: 250, bonus: { arrival: 0, perfect: 0 }, bonuses: {} },
    ]);
  });

  describe("with arrivals", () => {
    const stamp = (team: string, game: string, mark: ArrivalEntry["mark"], sequence: number): ArrivalEntry => ({ team, game, mark, sequence });

    it("adds the bonuses to the base score without changing the base of each game", () => {
      const teams = buildRanking(
        [{ team: "A", game: "nivel-1", score: 250 }, { team: "B", game: "nivel-1", score: 240 }],
        {},
        [stamp("A", "nivel-1", "qualified", 1), stamp("A", "nivel-1", "best", 1), stamp("B", "nivel-1", "qualified", 2), stamp("B", "nivel-1", "best", 2)],
      );
      assert.deepEqual(teams.map(({ team, total, base, bonus }) => ({ team, total, base, bonus })), [
        { team: "A", total: 295, base: 250, bonus: { arrival: 45, perfect: 0 } },
        { team: "B", total: 270, base: 240, bonus: { arrival: 30, perfect: 0 } },
      ]);
      assert.deepEqual(teams[0].games, { "nivel-1": 250 });
      assert.deepEqual(teams[0].bonuses, { "nivel-1": { place: 1, arrival: 45, perfect: 0 } });
    });

    it("breaks a tie in favour of the team that finished first", () => {
      const entries = [{ team: "Late", game: "nivel-1", score: 100 }, { team: "Early", game: "nivel-1", score: 100 }, { team: "Never", game: "nivel-1", score: 100 }];
      const arrivals = [stamp("Late", "nivel-1", "best", 9), stamp("Early", "nivel-1", "best", 4)];
      assert.deepEqual(buildRanking(entries, {}, arrivals).map((row) => row.team), ["Early", "Late", "Never"]);
    });

    it("uses the latest improvement of any game as the finishing time", () => {
      const entries = [{ team: "A", game: "nivel-1", score: 100 }, { team: "A", game: "nivel-2", score: 100 }, { team: "B", game: "nivel-1", score: 100 }, { team: "B", game: "nivel-2", score: 100 }];
      const arrivals = [stamp("A", "nivel-1", "best", 1), stamp("A", "nivel-2", "best", 8), stamp("B", "nivel-1", "best", 3), stamp("B", "nivel-2", "best", 4)];
      assert.deepEqual(buildRanking(entries, {}, arrivals).map((row) => row.team), ["B", "A"]);
    });

    it("ignores the arrivals of games that are not in the catalogue", () => {
      const teams = buildRanking([{ team: "A", game: "nivel-1", score: 10 }], {}, [stamp("A", "old-game", "qualified", 1)]);
      assert.deepEqual(teams[0].bonuses, {});
    });
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

describe("bonus", () => {
  const level = { maxScore: 300 };
  const stamp = (team: string, mark: ArrivalEntry["mark"], sequence: number, game = "nivel-1"): ArrivalEntry => ({ team, game, mark, sequence });

  it("needs 80 % of the maximum score to compete for a bonus", () => {
    assert.equal(bonusScore(level), 240);
    assert.deepEqual(arrivalMarks(level, 239), []);
    assert.deepEqual(arrivalMarks(level, 240), ["qualified"]);
    assert.deepEqual(arrivalMarks(level, 299), ["qualified"]);
    assert.deepEqual(arrivalMarks(level, 300), ["qualified", "perfect"]);
  });

  it("gives 45, 30 and 15 to the first three teams by arrival, and nothing to the fourth", () => {
    assert.deepEqual(ARRIVAL_BONUSES, [45, 30, 15]);
    const awarded = awardBonuses([stamp("C", "qualified", 7), stamp("A", "qualified", 2), stamp("D", "qualified", 9), stamp("B", "qualified", 5)]);
    assert.deepEqual(Object.keys(awarded).sort(), ["A", "B", "C"]);
    assert.deepEqual([awarded.A["nivel-1"], awarded.B["nivel-1"], awarded.C["nivel-1"]], [
      { place: 1, arrival: 45, perfect: 0 }, { place: 2, arrival: 30, perfect: 0 }, { place: 3, arrival: 15, perfect: 0 },
    ]);
  });

  it("counts the places of each game on their own", () => {
    const awarded = awardBonuses([stamp("A", "qualified", 1, "nivel-1"), stamp("A", "qualified", 2, "nivel-2"), stamp("B", "qualified", 3, "nivel-2")]);
    assert.equal(awarded.A["nivel-2"].arrival, 45);
    assert.equal(awarded.B["nivel-2"].arrival, 30);
  });

  it("gives the first perfect score a single extra bonus, even from outside the first three", () => {
    const arrivals = [stamp("A", "qualified", 1), stamp("B", "qualified", 2), stamp("C", "qualified", 3), stamp("D", "qualified", 4), stamp("D", "perfect", 4), stamp("A", "perfect", 8)];
    const awarded = awardBonuses(arrivals);
    assert.deepEqual(awarded.D["nivel-1"], { place: null, arrival: 0, perfect: FIRST_PERFECT_BONUS });
    assert.equal(awarded.A["nivel-1"].perfect, 0);
  });

  it("does not move a bonus when the team improves later: only the first stamps count", () => {
    const first = [stamp("A", "qualified", 1), stamp("A", "best", 1), stamp("B", "qualified", 2), stamp("B", "best", 2)];
    const improved = [...first, stamp("B", "best", 10)];
    assert.deepEqual(awardBonuses(improved), awardBonuses(first));
  });

  it("dates the finish of a team by its latest improvement", () => {
    const arrivals = [stamp("A", "best", 3), stamp("A", "best", 8, "nivel-2"), stamp("A", "qualified", 99), stamp("B", "best", 5)];
    assert.equal(finishedAt(arrivals, "A"), 8);
    assert.equal(finishedAt(arrivals, "Nobody"), Infinity);
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
