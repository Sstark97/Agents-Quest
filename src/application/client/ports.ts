import type { PlayStatus } from "../../domain/session/play-status";
import type { TeamRow } from "../../domain/session/ranking";
import type { ScoreSubmission } from "../../domain/session/score-submission";
import type { SessionInfo } from "../../domain/session/session";
import type { Stats } from "../../domain/session/stats";
import type { FacilitatorAction } from "../../domain/session/session";

/** Small persistent string store on the player's device. Never throws; a missing key reads as "". */
export interface KeyValueStore {
  read(key: string): string;
  write(key: string, value: string): void;
  remove(key: string): void;
}

/**
 * Answer of the session server. `body` is only present when the request succeeded and its content
 * could be read; a successful answer without a body means the response was not the expected one
 * (for instance, a proxy page), and callers treat it as a connection problem.
 */
export type Reply<T> = { ok: boolean; status: number; body: T | null };
export type RankingReply = { session: SessionInfo; teams: TeamRow[]; persistent: boolean };
export type CreatedSession = { code: string; name: string; adminKey: string };
export type ScorePayload = ScoreSubmission & { session: string };
/** A team opening a level. */
export type AttemptPayload = { session: string; team: string; game: string };
/** `attempt` and `limit` are null when the session has no attempt limit. */
export type AttemptReply = { attempt: number | null; limit: number | null };
/** `status` is null when the session has no attempt limit. */
export type PlayStatusReply = { status: PlayStatus | null };
/** Optional parameters of a facilitator action: the level to unlock, the new attempt limit, or whether the email step is on. */
export type FacilitatorActionInput = { level?: number; attempts?: number; enabled?: boolean };
/** A team leaving its email. It travels in the body of a POST, never in a URL. */
export type EmailPayload = { session: string; team: string; email: string; consent: boolean };

/** The session server as seen from the player's device. Every call rejects when there is no connection. */
export interface SessionGateway {
  findSession(code: string): Promise<Reply<SessionInfo>>;
  createSession(name: string, attempts?: number, collectEmails?: boolean): Promise<Reply<CreatedSession>>;
  runFacilitatorAction(code: string, key: string, action: FacilitatorAction, input?: FacilitatorActionInput): Promise<Reply<unknown>>;
  startAttempt(payload: AttemptPayload): Promise<Reply<AttemptReply>>;
  getPlayStatus(code: string, team: string): Promise<Reply<PlayStatusReply>>;
  submitScore(payload: ScorePayload): Promise<Reply<unknown>>;
  getRanking(code: string): Promise<Reply<RankingReply>>;
  getStats(code: string): Promise<Reply<Stats>>;
  submitEmail(payload: EmailPayload): Promise<Reply<unknown>>;
  getEmailCount(code: string, key: string): Promise<Reply<{ count: number }>>;
  exportEmails(code: string, key: string): Promise<Reply<{ fileName: string; csv: string }>>;
}
