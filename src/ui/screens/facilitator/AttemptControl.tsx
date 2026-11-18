import { ATTEMPT_LIMIT_MAX, ATTEMPT_LIMIT_MIN } from "@/src/domain/session/session";

const OPTIONS = Array.from({ length: ATTEMPT_LIMIT_MAX - ATTEMPT_LIMIT_MIN + 1 }, (_, index) => ATTEMPT_LIMIT_MIN + index);

/** Explains how many times a team may start each level. */
export const attemptsHelp = (limit: number) => `Cada equipo puede empezar cada nivel ${limit} ${limit === 1 ? "vez" : "veces"}. Cambiarlo no borra los intentos ya gastados.`;

/** Buttons to pick the attempts per level of a session (1 to 5). */
export function AttemptControl({ value, onChange }: { value: number; onChange: (limit: number) => void }) {
  return (
    <div className="row">
      {OPTIONS.map((limit) => <button key={limit} className={`btn ${limit === value ? "" : "ghost"}`} aria-pressed={limit === value} onClick={() => onChange(limit)}>{limit}</button>)}
    </div>
  );
}
