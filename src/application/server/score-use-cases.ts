import { arrivalMarks } from "../../domain/session/bonus";
import { GAME_IDS, findGame } from "../../domain/games/catalog";
import { buildRanking, type TeamRow } from "../../domain/session/ranking";
import { playStatus, type PlayStatus } from "../../domain/session/play-status";
import { parseScoreSubmission, parseTeam, parseTeamGame } from "../../domain/session/score-submission";
import { isWithinLimit, normalizeSessionCode, toSessionInfo, type SessionInfo } from "../../domain/session/session";
import { buildStats, type Stats } from "../../domain/session/stats";
import type { ScoreRepository, SessionRepository } from "./ports";

export type SubmitScoreResult = { ok: true } | { ok: false; error: "session-not-found" | "session-closed" | "invalid-data" | "no-attempt" };
/** attempt and limit are null for sessions created before the attempt limit existed: nothing is counted there. */
export type StartAttemptResult =
  | { ok: true; attempt: number | null; limit: number | null }
  | { ok: false; error: "session-not-found" | "session-closed" | "invalid-data" | "attempts-exhausted" };
/** status is null for sessions created before the attempt limit existed: there is nothing to show there. */
export type PlayStatusResult = { ok: true; status: PlayStatus | null } | { ok: false; error: "session-not-found" | "invalid-data" };
export type RankingResult = { ok: true; session: SessionInfo; teams: TeamRow[] } | { ok: false; error: "session-not-found" };
export type StatsResult = { ok: true; stats: Stats } | { ok: false; error: "session-not-found" };

type Dependencies = { sessions: SessionRepository; scores: ScoreRepository };
type RawAttempt = { session?: unknown; team?: unknown; game?: unknown };
type RawPlayStatus = { session?: unknown; team?: unknown };
type RawSubmission = { session?: unknown; team?: unknown; game?: unknown; score?: unknown; avatar?: unknown; tags?: unknown };

export function createScoreUseCases({ sessions, scores }: Dependencies) {
  const find = (code: string) => (code ? sessions.find(code) : Promise.resolve(null));

  return {
    /** A team opens a level: reserves one of its attempts, or says there are none left. */
    async startAttempt(raw: RawAttempt | null): Promise<StartAttemptResult> {
      const code = normalizeSessionCode(typeof raw?.session === "string" ? raw.session : "");
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (session.closed) return { ok: false, error: "session-closed" };
      const teamGame = parseTeamGame(raw);
      if (!teamGame) return { ok: false, error: "invalid-data" };
      if (session.attemptLimit === null) return { ok: true, attempt: null, limit: null };
      const attempt = await scores.bumpAttempt(code, teamGame.team, teamGame.game, "started", 1);
      if (!isWithinLimit(attempt, session.attemptLimit)) {
        await scores.bumpAttempt(code, teamGame.team, teamGame.game, "started", -1);
        return { ok: false, error: "attempts-exhausted" };
      }
      return { ok: true, attempt, limit: session.attemptLimit };
    },

    /** Read-only: attempts, best scores and bonuses of a team in every level. Spends nothing. */
    async getPlayStatus(raw: RawPlayStatus | null): Promise<PlayStatusResult> {
      const code = normalizeSessionCode(typeof raw?.session === "string" ? raw.session : "");
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      const team = parseTeam(raw?.team);
      if (!team) return { ok: false, error: "invalid-data" };
      if (session.attemptLimit === null) return { ok: true, status: null };
      const [started, best, arrivals] = await Promise.all([scores.attemptCounts(code, team, GAME_IDS, "started"), scores.bestScores(code), scores.arrivals(code)]);
      return { ok: true, status: playStatus({ team, limit: session.attemptLimit, started, best, arrivals }) };
    },

    /** A team finished a level: record its result in the session ranking. */
    async submitScore(raw: RawSubmission | null): Promise<SubmitScoreResult> {
      const code = normalizeSessionCode(typeof raw?.session === "string" ? raw.session : "");
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (session.closed) return { ok: false, error: "session-closed" };
      const submission = parseScoreSubmission(raw);
      if (!submission) return { ok: false, error: "invalid-data" };
      if (session.attemptLimit === null) {
        await scores.record(code, submission);
        return { ok: true };
      }
      // Every score must be backed by a started attempt, so repeating a request cannot add plays.
      const { team, game } = submission;
      const scored = await scores.bumpAttempt(code, team, game, "scored", 1);
      // A transient bump of "started" (undone when the limit is hit) must not let an extra score through.
      if (scored > session.attemptLimit || scored > (await scores.attemptCount(code, team, game, "started"))) {
        await scores.bumpAttempt(code, team, game, "scored", -1);
        return { ok: false, error: "no-attempt" };
      }
      try {
        // The bonus marks go first: if recording fails, a retry keeps the arrival the team already earned.
        const sequence = await scores.nextSequence(code);
        // Games in the submission were validated by parseScoreSubmission, so the catalog always has them.
        for (const mark of arrivalMarks(findGame(game)!, submission.score)) await scores.stampFirst(code, team, game, mark, sequence);
        await scores.record(code, submission, sequence);
      } catch (error) {
        await scores.bumpAttempt(code, team, game, "scored", -1);
        throw error;
      }
      return { ok: true };
    },

    async getRanking(rawCode: string): Promise<RankingResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      const entries = await scores.bestScores(code);
      const avatars = await scores.avatars(code);
      return { ok: true, session: toSessionInfo(code, session), teams: buildRanking(entries, avatars, await scores.arrivals(code)) };
    },

    /** Most common mistakes of a session (for the facilitator debrief and the projector screen). */
    async getStats(rawCode: string): Promise<StatsResult> {
      const code = normalizeSessionCode(rawCode);
      if (!(await find(code))) return { ok: false, error: "session-not-found" };
      return { ok: true, stats: buildStats(await scores.counters(code)) };
    },
  };
}

export type ScoreUseCases = ReturnType<typeof createScoreUseCases>;
