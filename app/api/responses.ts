import { NextResponse } from "next/server";

/** Maps the failures of the use cases to HTTP status codes and the messages shown to people. */
const FAILURES = {
  "session-not-found": { status: 404, message: "Sesión no encontrada" },
  "session-closed": { status: 403, message: "La sesión está cerrada" },
  "invalid-data": { status: 400, message: "Datos no válidos" },
  "invalid-key": { status: 403, message: "Clave de formador no válida" },
  "invalid-level": { status: 400, message: "Nivel no válido" },
  "invalid-action": { status: 400, message: "Acción no válida" },
  "missing-name": { status: 400, message: "Falta el nombre de la sesión" },
} as const;

export type FailureCode = keyof typeof FAILURES;

export const failure = (code: FailureCode) => NextResponse.json({ error: FAILURES[code].message }, { status: FAILURES[code].status });

/** Reads a JSON body; anything unreadable becomes null. */
export const readJson = async <T,>(request: Request) => (await request.json().catch(() => null)) as T | null;
