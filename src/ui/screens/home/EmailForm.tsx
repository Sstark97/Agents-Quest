"use client";
import { useEffect, useRef, useState } from "react";
import { EMAIL_CONSENT_TEXT, EMAIL_MAX } from "@/src/domain/session/email";
import { EmailPrivacyDialog } from "@/src/ui/components/EmailPrivacyDialog";
import { useServices } from "@/src/ui/services-context";

const CHECK_ERRORS = {
  "invalid-email": "Escribe un correo válido",
  "missing-consent": "Marca la casilla para poder guardar tu correo",
} as const;

type Props = {
  title?: string; submitLabel: string; skipLabel: string; busy: boolean; autoFocus?: boolean;
  onSubmit: (email: string, consent: boolean) => void; onSkip: () => void;
  notice?: { tone: "good" | "warn"; text: string } | null;
};

/** Optional email with its consent checkbox. The email lives only in this form until it is sent. */
export function EmailForm({ title, submitLabel, skipLabel, busy, autoFocus, onSubmit, onSkip, notice }: Props) {
  const { emails } = useServices();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [showInfo, setShowInfo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const closeInfo = useRef(() => setShowInfo(false)).current;

  useEffect(() => { if (autoFocus) inputRef.current?.focus(); }, [autoFocus]);

  const submit = () => {
    const check = emails.check(email, consent);
    if (check !== "ok") { setError(CHECK_ERRORS[check]); return; }
    setError("");
    onSubmit(email, consent);
  };

  return (
    <div>
      {title && <h2>{title}</h2>}
      <div className="muted">Correo (opcional)</div>
      <input ref={inputRef} type="email" inputMode="email" autoComplete="email" maxLength={EMAIL_MAX} placeholder="nombre@correo.es" value={email} onChange={(event) => { setEmail(event.target.value); setError(""); }} />
      <label className="consent">
        <input type="checkbox" checked={consent} onChange={(event) => { setConsent(event.target.checked); setError(""); }} />
        <span>{EMAIL_CONSENT_TEXT}</span>
      </label>
      <p><button type="button" className="linkbtn" onClick={() => setShowInfo(true)}>¿Para qué lo pedimos?</button></p>
      {error && <p className="fb bad" role="alert">{error}</p>}
      {!error && notice && <p className={`fb ${notice.tone}`} role="status">{notice.text}</p>}
      <div className="row">
        <button className="btn start" onClick={submit} disabled={busy}>{submitLabel}</button>
        <button className="btn ghost" onClick={onSkip} disabled={busy}>{skipLabel}</button>
      </div>
      {showInfo && <EmailPrivacyDialog onClose={closeInfo} />}
    </div>
  );
}
