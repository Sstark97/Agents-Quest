"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { StartOutcome } from "@/src/application/client/score-submitter";
import { useServices } from "@/src/ui/services-context";

export const ATTEMPT_NOTICE_MS = 1500;
/** A reservation that takes longer than this is treated as offline: play goes ahead. */
export const ATTEMPT_REQUEST_TIMEOUT_MS = 8000;
export const EXHAUSTED_MESSAGE = "Has agotado tus intentos en este nivel";
const OFFLINE_MESSAGE = "Sin conexión: este intento se contará cuando vuelva internet.";

export type AttemptNotice = { tone: "good" | "warn" | "bad"; text: string };

/**
 * Reserves an attempt with the server before a level starts or restarts. `begin(play)` runs `play` once the
 * attempt is reserved (after a short notice when the session has a limit) and never runs it when the
 * attempts are exhausted. `onReserved` runs once the outcome is known, before the notice. Without a session, or with a session without limit, `play` runs at once.
 */
export function useAttemptStart(game: string, team: string, onReserved?: () => void) {
  const { scores } = useServices();
  const [notice, setNotice] = useState<AttemptNotice | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  const begin = useCallback(async (play: () => void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true); setNotice(null);
    let timer: ReturnType<typeof setTimeout> | undefined;
    // The race settles once: a late reply is ignored, so `play` can never run twice.
    const timeout = new Promise<StartOutcome>((resolve) => { timer = setTimeout(() => resolve({ status: "queued" }), ATTEMPT_REQUEST_TIMEOUT_MS); });
    const outcome = await Promise.race([scores.startAttempt(team, game).catch((): StartOutcome => ({ status: "queued" })), timeout]);
    clearTimeout(timer);
    inFlight.current = false;
    if (!alive.current) return;
    setBusy(false);
    onReserved?.();
    if (outcome.status === "exhausted") { setNotice({ tone: "bad", text: EXHAUSTED_MESSAGE }); return; }
    const shown: AttemptNotice | null =
      outcome.status === "counted" && outcome.attempt !== null && outcome.limit !== null ? { tone: "good", text: `INTENTO ${outcome.attempt}/${outcome.limit}` }
      : outcome.status === "queued" ? { tone: "warn", text: OFFLINE_MESSAGE }
      : null;
    if (shown) {
      setNotice(shown);
      await new Promise((resolve) => setTimeout(resolve, ATTEMPT_NOTICE_MS));
      if (!alive.current) return;
      setNotice(null);
    }
    play();
  }, [scores, team, game, onReserved]);

  return { notice, busy, begin };
}
