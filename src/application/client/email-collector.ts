import { checkEmailAnswer, type EmailCheck } from "../../domain/session/email";
import type { KeyValueStore, SessionGateway } from "./ports";
import type { SessionMembership } from "./session-membership";
import { STORAGE_KEYS, scopedKey } from "./storage-keys";

/** "invalid": the answer is not valid (checked here or by the server). "offline": the email was not saved. */
export type EmailSubmitResult = "ok" | "invalid" | "nosession" | "closed" | "gone" | "disabled" | "offline";

const ASKED = "1";
const HTTP_SERVER_ERROR = 500;
const HTTP_BAD_REQUEST = 400;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

/**
 * The optional email step of a session. The email is personal data: it is only sent to the server
 * and never written on the device, queued or logged. The device only remembers that the question was answered.
 */
export function createEmailCollector(store: KeyValueStore, gateway: SessionGateway, membership: SessionMembership) {
  const askedKey = () => scopedKey(STORAGE_KEYS.emailAsked, membership.current()?.code);
  const asked = () => store.read(askedKey()) === ASKED;
  const markAsked = () => store.write(askedKey(), ASKED);

  return {
    /** The check the form shows before sending anything. */
    check: (email: string, consent: boolean): EmailCheck => checkEmailAnswer(email, consent),

    /** Whether the join flow must show the email step: the session asks for it and this device has not answered. */
    needsAnswer: (collectEmails: boolean) => collectEmails && membership.current() !== null && !asked(),

    /** Whether a team already in the session should be asked once: the flag is on, the session is open and nobody answered yet. */
    async shouldAsk(): Promise<boolean> {
      const session = membership.current();
      if (!session || asked()) return false;
      try {
        const reply = await gateway.findSession(session.code);
        return Boolean(reply.ok && reply.body && reply.body.collectEmails === true && !reply.body.closed);
      } catch {
        return false;
      }
    },

    /** The team chose not to leave an email: the question is not asked again on this device. */
    dismiss() {
      if (membership.current()) markAsked();
    },

    /** Sends the email with its consent. Only the "asked" mark is stored, and only when the server saved it. */
    async submit(team: string, email: string, consent: boolean): Promise<EmailSubmitResult> {
      if (checkEmailAnswer(email, consent) !== "ok") return "invalid";
      const session = membership.current();
      if (!session) return "nosession";
      try {
        const reply = await gateway.submitEmail({ session: session.code, team, email, consent });
        if (reply.ok) {
          if (!reply.body) return "offline";
          markAsked();
          return "ok";
        }
        if (reply.status >= HTTP_SERVER_ERROR) return "offline";
        if (reply.status === HTTP_BAD_REQUEST) return "invalid";
        if (reply.status === HTTP_FORBIDDEN) return "closed";
        if (reply.status === HTTP_NOT_FOUND) return "gone";
        if (reply.status === HTTP_CONFLICT) return "disabled";
        return "offline";
      } catch {
        return "offline";
      }
    },
  };
}

export type EmailCollector = ReturnType<typeof createEmailCollector>;
