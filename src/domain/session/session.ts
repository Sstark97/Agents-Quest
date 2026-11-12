/** A workshop session: one facilitator, many teams, one ranking. */
export type SessionRecord = { name: string; closed: boolean; adminKey: string; unlocked: number };

/** What anyone may know about a session (never the facilitator key). */
export type SessionInfo = { code: string; name: string; closed: boolean; unlocked: number };

export const SESSION_NAME_MAX = 40;
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

export const toSessionInfo = (code: string, session: SessionRecord): SessionInfo => ({ code, name: session.name, closed: session.closed, unlocked: session.unlocked });

/** What a facilitator can do with a session they created. */
export type FacilitatorAction = "close" | "open" | "reset" | "delete" | "unlock";
