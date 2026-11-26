"use client";
import { useEffect, useRef } from "react";
import { PRIVACY_POLICY_URL } from "@/src/domain/session/email";
import { useLockScroll } from "@/src/ui/hooks/useLockScroll";

const TITLE_ID = "email-privacy-title";

/** Basic data protection information shown before a team leaves its email. */
export function EmailPrivacyDialog({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useLockScroll();

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      if (event.key !== "Tab") return;
      // Keep Tab inside the dialog: it is modal.
      const items = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>("a[href], button") ?? []);
      if (items.length === 0) return;
      const first = items[0], last = items[items.length - 1];
      if (!dialogRef.current?.contains(document.activeElement)) { event.preventDefault(); first.focus(); }
      else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); previous?.focus(); };
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <div ref={dialogRef} className="card modal privacy" role="dialog" aria-modal="true" aria-labelledby={TITLE_ID} onClick={(event) => event.stopPropagation()}>
        <h2 id={TITLE_ID}>¿Para qué te pedimos el correo?</h2>
        <ul>
          <li><strong>Responsable:</strong> Lean Mind, S.L.</li>
          <li><strong>Finalidad:</strong> informarte de las próximas formaciones, talleres y eventos de LeanMind.</li>
          <li><strong>Legitimación:</strong> tu consentimiento, al marcar la casilla. Es opcional: puedes jugar igual sin dejar tu correo.</li>
          <li><strong>Conservación:</strong> el juego lo borra con la sesión (30 días); LeanMind lo conserva mientras no pidas la baja.</li>
          <li><strong>Derechos:</strong> acceso, rectificación, supresión, oposición y retirada del consentimiento en cualquier momento, como indica la política de privacidad.</li>
        </ul>
        <p><a href={PRIVACY_POLICY_URL} target="_blank" rel="noopener noreferrer">Política de privacidad completa</a></p>
        <div className="row"><button ref={closeRef} className="btn start" onClick={onClose}>CERRAR</button></div>
      </div>
    </div>
  );
}
