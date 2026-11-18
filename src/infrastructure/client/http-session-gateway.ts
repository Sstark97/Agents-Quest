import type { Reply, SessionGateway } from "../../application/client/ports";

async function request<T>(path: string, init?: RequestInit): Promise<Reply<T>> {
  const response = await fetch(path, init);
  const body = response.ok ? ((await response.json().catch(() => null)) as T | null) : null;
  return { ok: response.ok, status: response.status, body };
}

const get = <T,>(path: string) => request<T>(path, { cache: "no-store" });
const post = <T,>(path: string, body: unknown) => request<T>(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
const sessionPath = (code: string) => `/api/sessions/${encodeURIComponent(code)}`;
const query = (code: string) => `session=${encodeURIComponent(code)}`;

/** Talks to the session API of this same application over HTTP. */
export const httpSessionGateway: SessionGateway = {
  findSession: (code) => get(sessionPath(code)),
  createSession: (name, attempts) => post("/api/sessions", { name, attempts }),
  runFacilitatorAction: (code, key, action, input) => post(sessionPath(code), { key, action, level: input?.level, attempts: input?.attempts }),
  startAttempt: (payload) => post("/api/attempts", payload),
  submitScore: (payload) => post("/api/scores", payload),
  getRanking: (code) => get(`/api/scores?${query(code)}`),
  getStats: (code) => get(`/api/stats?${query(code)}`),
};
