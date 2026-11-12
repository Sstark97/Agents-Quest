import type { PlayerProfile } from "./player-profile";
import type { KeyValueStore, SessionGateway } from "./ports";
import { STORAGE_KEYS, parseStored, scopedKey } from "./storage-keys";

export type JoinedSession = { code: string; name: string };
export type JoinResult = { ok: true; session: JoinedSession } | { ok: false; reason: "missing-fields" | "not-found" | "closed" | "offline" };

/** Joining needs both the facilitator's code and a team name. */
export const hasJoinDetails = (code: string, team: string) => Boolean(code.trim() && team.trim());

/** The session this device has joined, if any. */
export function createSessionMembership(store: KeyValueStore, gateway: SessionGateway, profile: PlayerProfile) {
  const current = () => parseStored<JoinedSession | null>(store.read(STORAGE_KEYS.session), null);

  return {
    current,

    /** Joins a session with the facilitator's code and remembers the team name. */
    async join(code: string, team: string): Promise<JoinResult> {
      if (!hasJoinDetails(code, team)) return { ok: false, reason: "missing-fields" };
      try {
        const reply = await gateway.findSession(code.trim());
        if (!reply.ok) return { ok: false, reason: "not-found" };
        if (!reply.body) return { ok: false, reason: "offline" };
        if (reply.body.closed) return { ok: false, reason: "closed" };
        const session = { code: reply.body.code, name: reply.body.name };
        profile.renameTeam(team);
        store.write(STORAGE_KEYS.session, JSON.stringify(session));
        return { ok: true, session };
      } catch {
        return { ok: false, reason: "offline" };
      }
    },

    /** Leaving a session also erases the local scores of that session. */
    leave() {
      store.remove(scopedKey(STORAGE_KEYS.scores, current()?.code));
      store.remove(STORAGE_KEYS.session);
    },
  };
}

export type SessionMembership = ReturnType<typeof createSessionMembership>;
