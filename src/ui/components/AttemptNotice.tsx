import type { AttemptNotice as Notice } from "@/src/ui/hooks/useAttemptStart";

/** Feedback line of an attempt being reserved: busy, attempt number, offline or exhausted. */
export function AttemptNotice({ busy, notice }: { busy: boolean; notice: Notice | null }) {
  if (busy) return <p className="muted">Reservando intento...</p>;
  return notice ? <p className={`fb ${notice.tone}`}>{notice.text}</p> : null;
}
