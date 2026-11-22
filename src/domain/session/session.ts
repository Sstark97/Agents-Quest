/** A workshop session: one facilitator, many teams, one ranking. */
export type SessionRecord = { name: string; closed: boolean; adminKey: string; unlocked: number; attemptLimit: number | null; collectEmails: boolean };

/** What anyone may know about a session (never the facilitator key). */
export type SessionInfo = { code: string; name: string; closed: boolean; unlocked: number; attemptLimit: number | null; collectEmails: boolean };

export const SESSION_NAME_MAX = 40;
/** Attempts per team and level a new session gets when the facilitator does not choose. */
export const DEFAULT_ATTEMPT_LIMIT = 2;
export const ATTEMPT_LIMIT_MIN = 1;
export const ATTEMPT_LIMIT_MAX = 5;
export const SESSION_CODE_LENGTH = 5;
export const SESSION_CODE_MAX = 8;
/** Sessions and their scores expire after 30 days. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;

/** No 0/O/1/I, so the code can be read out loud. */
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export const normalizeSessionCode = (raw: string) => raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, SESSION_CODE_MAX);

/** Builds a session code out of random bytes (one character per byte). */
export const sessionCodeFromBytes = (bytes: Uint8Array) => [...bytes].map((byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");

export const sanitizeSessionName = (raw: unknown) => (typeof raw === "string" ? raw.trim().slice(0, SESSION_NAME_MAX) : "");

/** A valid attempt limit, or null when the value is not an integer between the minimum and the maximum. */
export const parseAttemptLimit = (raw: unknown): number | null =>
  typeof raw === "number" && Number.isInteger(raw) && raw >= ATTEMPT_LIMIT_MIN && raw <= ATTEMPT_LIMIT_MAX ? raw : null;

/** Whether `used` attempts fit in the limit. A null limit (sessions created before the limit existed) is unlimited. */
export const isWithinLimit = (used: number, limit: number | null) => limit === null || used <= limit;

export const toSessionInfo = (code: string, session: SessionRecord): SessionInfo => ({ code, name: session.name, closed: session.closed, unlocked: session.unlocked, attemptLimit: session.attemptLimit, collectEmails: session.collectEmails });

/** What a facilitator can do with a session they created. */
export type FacilitatorAction = "close" | "open" | "reset" | "delete" | "unlock" | "attempts" | "emails";

/** Whether the key is the facilitator key of the session. */
export const hasFacilitatorKey = (session: SessionRecord, key: unknown) => typeof key === "string" && key === session.adminKey;
