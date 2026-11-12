import { buildRanking, type TeamRow } from "../../domain/session/ranking";
import { parseScoreSubmission } from "../../domain/session/score-submission";
import { normalizeSessionCode, toSessionInfo, type SessionInfo } from "../../domain/session/session";
import { buildStats, type Stats } from "../../domain/session/stats";
import type { ScoreRepository, SessionRepository } from "./ports";

export type SubmitScoreResult = { ok: true } | { ok: false; error: "session-not-found" | "session-closed" | "invalid-data" };
export type RankingResult = { ok: true; session: SessionInfo; teams: TeamRow[] } | { ok: false; error: "session-not-found" };
export type StatsResult = { ok: true; stats: Stats } | { ok: false; error: "session-not-found" };

type Dependencies = { sessions: SessionRepository; scores: ScoreRepository };
type RawSubmission = { session?: unknown; team?: unknown; game?: unknown; score?: unknown; avatar?: unknown; tags?: unknown };

export function createScoreUseCases({ sessions, scores }: Dependencies) {
  const find = (code: string) => (code ? sessions.find(code) : Promise.resolve(null));

  return {
    /** A team finished a level: record its result in the session ranking. */
    async submitScore(raw: RawSubmission | null): Promise<SubmitScoreResult> {
      const code = normalizeSessionCode(typeof raw?.session === "string" ? raw.session : "");
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (session.closed) return { ok: false, error: "session-closed" };
      const submission = parseScoreSubmission(raw);
      if (!submission) return { ok: false, error: "invalid-data" };
      await scores.record(code, submission);
      return { ok: true };
    },

    async getRanking(rawCode: string): Promise<RankingResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      const entries = await scores.bestScores(code);
      const avatars = await scores.avatars(code);
      return { ok: true, session: toSessionInfo(code, session), teams: buildRanking(entries, avatars) };
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
