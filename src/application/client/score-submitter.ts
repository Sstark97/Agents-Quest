import type { PlayerProfile } from "./player-profile";
import type { KeyValueStore, ScorePayload, SessionGateway } from "./ports";
import type { SessionMembership } from "./session-membership";
import { STORAGE_KEYS, parseStored } from "./storage-keys";

export type SubmitResult = "ok" | "nosession" | "closed" | "gone" | "fail" | "queued";
const PENDING_MAX = 50;

/** Sends finished plays to the session ranking, queueing them while there is no connection. */
export function createScoreSubmitter(store: KeyValueStore, gateway: SessionGateway, membership: SessionMembership, profile: PlayerProfile) {
  const pending = () => parseStored<ScorePayload[]>(store.read(STORAGE_KEYS.pendingScores), []);
  const savePending = (queue: ScorePayload[]) => store.write(STORAGE_KEYS.pendingScores, JSON.stringify(queue.slice(-PENDING_MAX)));

  /** "unreachable" means the server could not be reached or failed: worth retrying later. */
  async function send(payload: ScorePayload): Promise<SubmitResult | "unreachable"> {
    try {
      const reply = await gateway.submitScore(payload);
      if (reply.ok) return "ok";
      if (reply.status >= 500) return "unreachable";
      return reply.status === 403 ? "closed" : reply.status === 404 ? "gone" : "fail";
    } catch {
      return "unreachable";
    }
  }

  return {
    /** Sends the score to the session ranking. Offline, it is stored and re-sent when the connection is back. */
    async submit(team: string, game: string, score: number, tags: string[] = []): Promise<SubmitResult> {
      const session = membership.current();
      if (!session) return "nosession";
      const payload: ScorePayload = { session: session.code, team, game, score, avatar: profile.avatar(), tags };
      const result = await send(payload);
      if (result === "unreachable") { savePending([...pending(), payload]); return "queued"; }
      return result;
    },

    /** Retries the pending submissions. Returns how many are still waiting. */
    async flushPending(): Promise<number> {
      const queue = pending();
      if (!queue.length) return 0;
      const rest: ScorePayload[] = [];
      for (let i = 0; i < queue.length; i++) {
        if ((await send(queue[i])) === "unreachable") { rest.push(...queue.slice(i)); break; }
      }
      savePending(rest);
      return rest.length;
    },

    pendingCount: () => pending().length,
  };
}

export type ScoreSubmitter = ReturnType<typeof createScoreSubmitter>;
