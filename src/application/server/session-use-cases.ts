import { GAMES } from "../../domain/games/catalog";
import { DEFAULT_ATTEMPT_LIMIT, SESSION_CODE_LENGTH, normalizeSessionCode, parseAttemptLimit, sanitizeSessionName, sessionCodeFromBytes, toSessionInfo, type SessionInfo } from "../../domain/session/session";
import type { RandomSource, ScoreRepository, SessionRepository } from "./ports";

const CREATE_ATTEMPTS = 6;
const ADMIN_KEY_BYTES = 12;

export type CreateSessionResult = { ok: true; code: string; adminKey: string; name: string } | { ok: false; error: "missing-name" | "invalid-attempts" };
export type FindSessionResult = { ok: true; session: SessionInfo } | { ok: false; error: "session-not-found" };
export type FacilitatorActionResult = { ok: true } | { ok: false; error: "session-not-found" | "invalid-key" | "invalid-level" | "invalid-action" | "invalid-attempts" };

type Dependencies = { sessions: SessionRepository; scores: ScoreRepository; random: RandomSource };

export function createSessionUseCases({ sessions, scores, random }: Dependencies) {
  const find = (code: string) => (code ? sessions.find(code) : Promise.resolve(null));

  return {
    /** The facilitator starts a workshop: gets a code for the teams and a private key to manage it. */
    async createSession(rawName: unknown, rawAttempts?: unknown): Promise<CreateSessionResult> {
      const name = sanitizeSessionName(rawName);
      if (!name) return { ok: false, error: "missing-name" };
      const attemptLimit = rawAttempts === undefined || rawAttempts === null ? DEFAULT_ATTEMPT_LIMIT : parseAttemptLimit(rawAttempts);
      if (attemptLimit === null) return { ok: false, error: "invalid-attempts" };
      for (let attempt = 0; attempt < CREATE_ATTEMPTS; attempt++) {
        const code = sessionCodeFromBytes(random.bytes(SESSION_CODE_LENGTH));
        const adminKey = random.hex(ADMIN_KEY_BYTES);
        if (await sessions.create(code, { name, closed: false, adminKey, unlocked: 0, attemptLimit })) return { ok: true, code, adminKey, name };
      }
      throw new Error("Could not generate a session code");
    },

    async findSession(rawCode: string): Promise<FindSessionResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      return session ? { ok: true, session: toSessionInfo(code, session) } : { ok: false, error: "session-not-found" };
    },

    /** Facilitator-only actions, guarded by the key handed out when the session was created. */
    async runFacilitatorAction(rawCode: string, input: { key?: unknown; action?: unknown; level?: unknown; attempts?: unknown } | null): Promise<FacilitatorActionResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (typeof input?.key !== "string" || input.key !== session.adminKey) return { ok: false, error: "invalid-key" };
      switch (input.action) {
        case "close": await sessions.setClosed(code, true); break;
        case "open": await sessions.setClosed(code, false); break;
        case "unlock": {
          const levels = Number(input.level);
          if (!Number.isInteger(levels) || levels < 0 || levels > GAMES.length) return { ok: false, error: "invalid-level" };
          await sessions.setUnlocked(code, levels);
          break;
        }
        case "attempts": {
          // Sessions created before the limit existed stay without limit.
          if (session.attemptLimit === null) return { ok: false, error: "invalid-action" };
          const limit = parseAttemptLimit(input.attempts);
          if (limit === null) return { ok: false, error: "invalid-attempts" };
          await sessions.setAttemptLimit(code, limit);
          break;
        }
        case "reset": await scores.clear(code); break;
        case "delete": await sessions.delete(code); await scores.clear(code); break;
        default: return { ok: false, error: "invalid-action" };
      }
      return { ok: true };
    },
  };
}

export type SessionUseCases = ReturnType<typeof createSessionUseCases>;
