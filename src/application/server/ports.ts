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
  delete(code: string): Promise<void>;
}

/** Where the scores, avatars and play counters of a session live. */
export interface ScoreRepository {
  /** Keeps the best score of the team in the game, its avatar, and counts the play and its mistake labels. */
  record(code: string, submission: ScoreSubmission): Promise<void>;
  bestScores(code: string): Promise<ScoreEntry[]>;
  avatars(code: string): Promise<Record<string, number>>;
  counters(code: string): Promise<PlayCounter[]>;
  /** Removes every score, avatar and counter of the session. */
  clear(code: string): Promise<void>;
}

/** Source of unpredictable values for session codes and facilitator keys. */
export interface RandomSource {
  bytes(length: number): Uint8Array;
  hex(byteLength: number): string;
}
