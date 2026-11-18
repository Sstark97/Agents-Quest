import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GAME_IDS } from "../../src/domain/games/catalog";
import { ARRIVAL_BONUSES, FIRST_PERFECT_BONUS, awardBonuses, type ArrivalEntry } from "../../src/domain/session/bonus";
import { playStatus } from "../../src/domain/session/play-status";
import { parseTeam } from "../../src/domain/session/score-submission";

const stamp = (team: string, game: string, mark: ArrivalEntry["mark"], sequence: number): ArrivalEntry => ({ team, game, mark, sequence });
const base = { team: "A", limit: 2, started: {}, best: [], arrivals: [] };

describe("play status", () => {
  it("gives every level full attempts and no score for an empty session", () => {
    const status = playStatus(base);
    assert.equal(status.limit, 2);
    assert.deepEqual(Object.keys(status.games), GAME_IDS);
    for (const id of GAME_IDS) assert.deepEqual(status.games[id], { used: 0, left: 2, best: null, arrivalTaken: 0, perfectBy: null, mine: null });
  });

  it("never reports more attempts used than the limit, nor negative attempts left", () => {
    const status = playStatus({ ...base, started: { "nivel-1": 5, "nivel-2": 1 } });
    assert.deepEqual([status.games["nivel-1"].used, status.games["nivel-1"].left], [2, 0]);
    assert.deepEqual([status.games["nivel-2"].used, status.games["nivel-2"].left], [1, 1]);
  });

  it("counts the places taken by every team, capped at the number of speed bonuses", () => {
    const arrivals = ["A", "B", "C", "D", "E"].map((team, index) => stamp(team, "nivel-1", "qualified", index + 1));
    const status = playStatus({ ...base, team: "C", arrivals });
    assert.equal(status.games["nivel-1"].arrivalTaken, ARRIVAL_BONUSES.length);
    assert.equal(status.games["nivel-2"].arrivalTaken, 0);
    assert.deepEqual(status.games["nivel-1"].mine, awardBonuses(arrivals).C["nivel-1"]);
    assert.equal(playStatus({ ...base, team: "E", arrivals }).games["nivel-1"].mine, null);
  });

  it("names the team with the first perfect and shows the bonus of the asking team", () => {
    const arrivals = [stamp("B", "nivel-3", "qualified", 1), stamp("B", "nivel-3", "perfect", 1), stamp("A", "nivel-3", "qualified", 2), stamp("A", "nivel-3", "perfect", 2)];
    const status = playStatus({ ...base, arrivals, best: [{ team: "A", game: "nivel-3", score: 300 }, { team: "B", game: "nivel-3", score: 300 }] });
    assert.equal(status.games["nivel-3"].perfectBy, "B");
    assert.deepEqual(status.games["nivel-3"].mine, { place: 2, arrival: ARRIVAL_BONUSES[1], perfect: 0 });
    assert.equal(playStatus({ ...base, team: "B", arrivals }).games["nivel-3"].mine?.perfect, FIRST_PERFECT_BONUS);
  });

  it("takes the best score of the asking team only and ignores unknown games", () => {
    const best = [{ team: "A", game: "nivel-1", score: 120 }, { team: "B", game: "nivel-1", score: 250 }, { team: "A", game: "nivel-99", score: 10 }];
    const status = playStatus({ ...base, best, started: { "nivel-99": 1 }, arrivals: [stamp("A", "nivel-99", "qualified", 1)] });
    assert.equal(status.games["nivel-1"].best, 120);
    assert.equal(status.games["nivel-99"], undefined);
  });
});

describe("parseTeam", () => {
  it("trims the name and rejects an empty one or one with the storage separator", () => {
    assert.equal(parseTeam("  Bits "), "Bits");
    assert.equal(parseTeam("   "), null);
    assert.equal(parseTeam(undefined), null);
    assert.equal(parseTeam("a::b"), null);
  });
});
