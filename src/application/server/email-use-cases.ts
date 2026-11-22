import { buildConsentCsv, consentCsvFileName, consentRecord, parseEmailSubmission } from "../../domain/session/email";
import { hasFacilitatorKey, normalizeSessionCode } from "../../domain/session/session";
import type { EmailRepository, SessionRepository } from "./ports";

export type SubmitEmailResult =
  | { ok: true }
  | { ok: false; error: "session-not-found" | "session-closed" | "emails-disabled" | "invalid-data" | "invalid-email" | "missing-consent" };
export type EmailCountResult = { ok: true; count: number } | { ok: false; error: "session-not-found" | "invalid-key" };
export type ExportEmailsResult = { ok: true; fileName: string; csv: string } | { ok: false; error: "session-not-found" | "invalid-key" };

type Dependencies = { sessions: SessionRepository; emails: EmailRepository; now: () => Date };
type RawEmail = { session?: unknown; team?: unknown; email?: unknown; consent?: unknown };
type RawKey = { key?: unknown };

/** Personal data: no result carries an email except the facilitator's export, and nothing here is ever logged. */
export function createEmailUseCases({ sessions, emails, now }: Dependencies) {
  const find = (code: string) => (code ? sessions.find(code) : Promise.resolve(null));

  return {
    /** A team leaves its email, with its consent. The last one sent replaces the earlier one. */
    async submitEmail(raw: RawEmail | null): Promise<SubmitEmailResult> {
      const code = normalizeSessionCode(typeof raw?.session === "string" ? raw.session : "");
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (session.closed) return { ok: false, error: "session-closed" };
      if (!session.collectEmails) return { ok: false, error: "emails-disabled" };
      const submission = parseEmailSubmission(raw);
      if (!submission.ok) return { ok: false, error: submission.error };
      await emails.save(code, consentRecord(submission, now()));
      return { ok: true };
    },

    /** Facilitator-only: how many emails the session has gathered. */
    async getEmailCount(rawCode: string, input: RawKey | null): Promise<EmailCountResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (!hasFacilitatorKey(session, input?.key)) return { ok: false, error: "invalid-key" };
      return { ok: true, count: await emails.count(code) };
    },

    /** Facilitator-only: the CSV with the emails and the proof of each consent. */
    async exportEmails(rawCode: string, input: RawKey | null): Promise<ExportEmailsResult> {
      const code = normalizeSessionCode(rawCode);
      const session = await find(code);
      if (!session) return { ok: false, error: "session-not-found" };
      if (!hasFacilitatorKey(session, input?.key)) return { ok: false, error: "invalid-key" };
      return { ok: true, fileName: consentCsvFileName(code), csv: buildConsentCsv(await emails.list(code)) };
    },
  };
}

export type EmailUseCases = ReturnType<typeof createEmailUseCases>;
