import type { ArrivalEntry } from "../../domain/session/bonus";
import type { ConsentRecord } from "../../domain/session/email";
import type { ScoreEntry } from "../../domain/session/ranking";
import type { ScoreSubmission } from "../../domain/session/score-submission";
import type { SessionRecord } from "../../domain/session/session";
import type { PlayCounter } from "../../domain/session/stats";

/** Where sessions live. */
export interface SessionRepository {
  /** Stores a new session. Returns false when the code is already taken. */
  create(code: string, session: SessionRecord): Promise<boolean>;
  find(code: string): Promise<SessionRecord | null>;
  setClosed(code: string, closed: boolean): Promise<void>;
  /** Opens levels 1..levels (0 = none). */
  setUnlocked(code: string, levels: number): Promise<void>;
  /** Changes the attempts per team and level. Attempts already spent are not touched. */
  setAttemptLimit(code: string, limit: number): Promise<void>;
  /** Turns on or off the email step of the session. */
  setCollectEmails(code: string, enabled: boolean): Promise<void>;
  delete(code: string): Promise<void>;
}

/** Where the emails of a session live. Apart from the scores: they have their own lifecycle and nothing public may read them. */
export interface EmailRepository {
  /** Stores the record, replacing the earlier one of the same team. It expires no later than the session. */
  save(code: string, record: ConsentRecord): Promise<void>;
  count(code: string): Promise<number>;
  list(code: string): Promise<ConsentRecord[]>;
  /** Removes every email of the session. */
  clear(code: string): Promise<void>;
}

/** An attempt is "started" when the team opens the level and "scored" when its result reaches the ranking. */
export type AttemptKind = "started" | "scored";

/** Where the scores, avatars and play counters of a session live. */
export interface ScoreRepository {
  /**
   * Keeps the best score of the team in the game, its avatar, and counts the play and its mistake labels.
   * When the best score improves and a sequence is given, it also stamps that sequence as the "best" arrival.
   */
  record(code: string, submission: ScoreSubmission, sequence?: number): Promise<void>;
  /** Next number of the session's arrival sequence: atomic and always growing (it is not a clock). */
  nextSequence(code: string): Promise<number>;
  /** Stamps the arrival of the team in the game unless it already has that mark: the first stamp is never overwritten. */
  stampFirst(code: string, team: string, game: string, mark: "qualified" | "perfect", sequence: number): Promise<void>;
  arrivals(code: string): Promise<ArrivalEntry[]>;
  /** Adds delta to the attempt counter of the team in the game, atomically. Returns the new value. */
  bumpAttempt(code: string, team: string, game: string, kind: AttemptKind, delta: 1 | -1): Promise<number>;
  attemptCount(code: string, team: string, game: string, kind: AttemptKind): Promise<number>;
  /** Read-only: the attempt counter of the team in each of the games (0 when there is none). */
  attemptCounts(code: string, team: string, games: string[], kind: AttemptKind): Promise<Record<string, number>>;
  bestScores(code: string): Promise<ScoreEntry[]>;
  avatars(code: string): Promise<Record<string, number>>;
  counters(code: string): Promise<PlayCounter[]>;
  /** Removes every score, avatar, play counter, attempt counter and arrival stamp of the session. */
  clear(code: string): Promise<void>;
}

/** Source of unpredictable values for session codes and facilitator keys. */
export interface RandomSource {
  bytes(length: number): Uint8Array;
  hex(byteLength: number): string;
}
