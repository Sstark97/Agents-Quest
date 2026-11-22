import type { FacilitatorAction } from "../../domain/session/session";
import type { FacilitatorActionInput, KeyValueStore, SessionGateway } from "./ports";
import { STORAGE_KEYS, parseStored } from "./storage-keys";

/** A session created on this device, together with the key that allows managing it. */
export type FacilitatorSession = { code: string; name: string; key: string };
export type SessionStatus = { closed: boolean; unlocked: number; attemptLimit: number | null; collectEmails: boolean } | "gone" | null;
export type ExportEmailsOutcome = { ok: true; fileName: string; csv: string } | { ok: false; reason: "rejected" | "offline" };
export type CreateOutcome = { ok: true; session: FacilitatorSession } | { ok: false; reason: "rejected" | "offline" };

/** The facilitator's side: creating sessions and managing the ones created on this device. */
export function createFacilitator(store: KeyValueStore, gateway: SessionGateway) {
  const sessions = () => parseStored<FacilitatorSession[]>(store.read(STORAGE_KEYS.facilitatorSessions), []);
  const save = (list: FacilitatorSession[]) => store.write(STORAGE_KEYS.facilitatorSessions, JSON.stringify(list));
  const remember = (session: FacilitatorSession) => save([session, ...sessions().filter((other) => other.code !== session.code)]);

  return {
    sessions,
    forget: (code: string) => save(sessions().filter((session) => session.code !== code)),

    async createSession(name: string, attempts?: number, collectEmails?: boolean): Promise<CreateOutcome> {
      try {
        const reply = await gateway.createSession(name, attempts, collectEmails);
        if (!reply.ok) return { ok: false, reason: "rejected" };
        if (!reply.body) return { ok: false, reason: "offline" };
        const session = { code: reply.body.code, name: reply.body.name, key: reply.body.adminKey };
        remember(session);
        return { ok: true, session };
      } catch {
        return { ok: false, reason: "offline" };
      }
    },

    /** Current state of a session: "gone" when it no longer exists, null when it cannot be known. */
    async status(code: string): Promise<SessionStatus> {
      try {
        const reply = await gateway.findSession(code);
        return reply.ok && reply.body ? reply.body : reply.status === 404 ? "gone" : null;
      } catch {
        return null;
      }
    },

    /** How many emails the session has gathered, or null when it cannot be known. */
    async emailCount(session: FacilitatorSession): Promise<number | null> {
      try {
        const reply = await gateway.getEmailCount(session.code, session.key);
        return reply.ok && reply.body ? reply.body.count : null;
      } catch {
        return null;
      }
    },

    /** The CSV with the session's emails. Nothing is kept on the device. */
    async exportEmails(session: FacilitatorSession): Promise<ExportEmailsOutcome> {
      try {
        const reply = await gateway.exportEmails(session.code, session.key);
        if (!reply.ok) return { ok: false, reason: "rejected" };
        if (!reply.body) return { ok: false, reason: "offline" };
        return { ok: true, fileName: reply.body.fileName, csv: reply.body.csv };
      } catch {
        return { ok: false, reason: "offline" };
      }
    },

    /** Runs a facilitator action. Resolves to whether the server accepted it. */
    async act(session: FacilitatorSession, action: FacilitatorAction, input?: FacilitatorActionInput): Promise<boolean> {
      return (await gateway.runFacilitatorAction(session.code, session.key, action, input)).ok;
    },
  };
}

export type Facilitator = ReturnType<typeof createFacilitator>;
