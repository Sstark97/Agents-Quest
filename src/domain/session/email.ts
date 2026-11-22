import { parseTeam } from "./score-submission";

export const EMAIL_MAX = 254;
export const EMAIL_LOCAL_MAX = 64;

/**
 * One @, no spaces or control characters, a dot in the domain, no empty labels, a top-level domain of 2+ characters.
 * The local part starts with a letter or digit, so an email never starts with = + - @ (spreadsheet formulas).
 */
export const EMAIL_PATTERN = /^[\p{L}\p{N}][^\s\p{Cc}@<>()[\]\\,;:"]*@(?:[^\s\p{Cc}@<>()[\]\\,;:".]+\.)+[^\s\p{Cc}@<>()[\]\\,;:".]{2,}$/u;

/** Bump the version whenever the checkbox text or the information popup changes: it proves what each person accepted. */
export const EMAIL_CONSENT_VERSION = "2026-11-v1";
export const EMAIL_CONSENT_TEXT = "Acepto que Lean Mind, S.L. use mi correo para enviarme newsletters y comunicaciones comerciales. Puedo darme de baja cuando quiera.";
export const PRIVACY_POLICY_URL = "https://leanmind.es/es/politica-privacidad";

export const CONSENT_CSV_HEADER = ["equipo", "correo", "fecha_consentimiento", "version_texto"];
const FORMULA_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];
const CSV_LINE_BREAK = "\r\n";

/** The email trimmed with only its domain lowercased, or null when it is not a usable email. */
export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  const at = trimmed.lastIndexOf("@");
  if (at < 0) return null;
  const email = `${trimmed.slice(0, at)}@${trimmed.slice(at + 1).toLowerCase()}`;
  if (email.length > EMAIL_MAX || at > EMAIL_LOCAL_MAX) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
}

export type EmailCheck = "ok" | "invalid-email" | "missing-consent";

/** The check shared by the form and the server: a valid email and the consent box ticked. */
export function checkEmailAnswer(email: string, consent: boolean): EmailCheck {
  if (normalizeEmail(email) === null) return "invalid-email";
  return consent ? "ok" : "missing-consent";
}

export type EmailSubmission = { team: string; email: string };
export type EmailSubmissionResult = ({ ok: true } & EmailSubmission) | { ok: false; error: "invalid-data" | "invalid-email" | "missing-consent" };

/** Validates untrusted input. The consent must be exactly `true`. */
export function parseEmailSubmission(raw: { team?: unknown; email?: unknown; consent?: unknown } | null): EmailSubmissionResult {
  const team = parseTeam(raw?.team);
  if (!team) return { ok: false, error: "invalid-data" };
  const email = normalizeEmail(raw?.email);
  if (email === null) return { ok: false, error: "invalid-email" };
  if (raw?.consent !== true) return { ok: false, error: "missing-consent" };
  return { ok: true, team, email };
}

/** An email together with the proof of the consent. */
export type ConsentRecord = { team: string; email: string; consentedAt: string; version: string };

export const consentRecord = ({ team, email }: EmailSubmission, now: Date): ConsentRecord => ({ team, email, consentedAt: now.toISOString(), version: EMAIL_CONSENT_VERSION });

/** A CSV cell: formulas are neutralised with a leading quote and the cell is quoted when it needs to be. */
export function csvCell(value: string): string {
  const safe = FORMULA_PREFIXES.some((prefix) => value.startsWith(prefix)) ? `'${value}` : value;
  return /["\r\n,]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** The CSV of the session's emails, oldest first, comma separated, CRLF lines. */
export function buildConsentCsv(records: ConsentRecord[]): string {
  const rows = [...records]
    .sort((a, b) => a.consentedAt.localeCompare(b.consentedAt))
    .map((record) => [record.team, record.email, record.consentedAt, record.version]);
  return [CONSENT_CSV_HEADER, ...rows].map((row) => row.map(csvCell).join(",")).join(CSV_LINE_BREAK) + CSV_LINE_BREAK;
}

export const consentCsvFileName = (code: string) => `correos-${code}.csv`;
