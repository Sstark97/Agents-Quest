import type { PlayerProfile } from "./player-profile";
import type { AttemptPayload, KeyValueStore, ScorePayload, SessionGateway } from "./ports";
import type { SessionMembership } from "./session-membership";
import { STORAGE_KEYS, parseStored } from "./storage-keys";

export type SubmitResult = "ok" | "nosession" | "closed" | "gone" | "fail" | "queued" | "refused";
/**
 * "free": no session, so no limit. "exhausted": the only outcome that blocks play. "queued": the start
 * could not be reserved yet and will be sent later; play is allowed.
 */
export type StartOutcome =
  | { status: "free" | "exhausted" | "queued" | "closed" | "gone" | "fail" }
  | { status: "counted"; attempt: number | null; limit: number | null };

/** A level start waiting to be reserved. Items stored before starts existed have no `kind` and are scores. */
type StartItem = AttemptPayload & { kind: "start" };
type PendingItem = ScorePayload | StartItem;
const PENDING_MAX = 50;
const HTTP_SERVER_ERROR = 500;
const HTTP_FORBIDDEN = 403;
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;

const isStart = (item: PendingItem): item is StartItem => "kind" in item && item.kind === "start";

/** Sends finished plays to the session ranking, queueing them while there is no connection. */
export function createScoreSubmitter(store: KeyValueStore, gateway: SessionGateway, membership: SessionMembership, profile: PlayerProfile) {
  const pending = () => parseStored<PendingItem[]>(store.read(STORAGE_KEYS.pendingScores), []);
  const savePending = (queue: PendingItem[]) => store.write(STORAGE_KEYS.pendingScores, JSON.stringify(queue.slice(-PENDING_MAX)));

  type Sent = { status: number; ok: boolean };
  /** Null means the server could not be reached or failed: worth retrying later. */
  async function post(item: PendingItem): Promise<Sent | null> {
    try {
      const reply = isStart(item)
        ? await gateway.startAttempt({ session: item.session, team: item.team, game: item.game })
        : await gateway.submitScore(item);
      if (isStart(item) && reply.ok && !reply.body) return null; // unreadable body: same as the direct start
      return reply.status >= HTTP_SERVER_ERROR ? null : { status: reply.status, ok: reply.ok };
    } catch {
      return null;
    }
  }

  async function send(payload: ScorePayload): Promise<SubmitResult | "unreachable"> {
    const sent = await post(payload);
    if (!sent) return "unreachable";
    if (sent.ok) return "ok";
    return sent.status === HTTP_FORBIDDEN ? "closed" : sent.status === HTTP_NOT_FOUND ? "gone" : sent.status === HTTP_CONFLICT ? "refused" : "fail";
  }

  const keyOf = (item: PendingItem) => JSON.stringify(item);

  /** Sends the stored items in order and removes only those sent; items queued meanwhile stay. Returns how many remain. */
  async function runFlush(): Promise<number> {
    const queue = pending();
    if (!queue.length) return 0;
    const sent = new Map<string, number>();
    for (const item of queue) {
      if (!(await post(item))) break;
      sent.set(keyOf(item), (sent.get(keyOf(item)) ?? 0) + 1);
    }
    const rest = pending().filter((item) => {
      const left = sent.get(keyOf(item)) ?? 0;
      if (left > 0) { sent.set(keyOf(item), left - 1); return false; }
      return true;
    });
    savePending(rest);
    return rest.length;
  }

  /** Retries the pending items in order. Concurrent callers share one run, so nothing is sent twice. */
  let flushing: Promise<number> | null = null;
  function flushPending(): Promise<number> {
    if (!flushing) flushing = runFlush().finally(() => { flushing = null; });
    return flushing;
  }

  return {
    /** Reserves an attempt when a team opens a level. Offline, the start is queued and play goes ahead. */
    async startAttempt(team: string, game: string): Promise<StartOutcome> {
      const session = membership.current();
      if (!session) return { status: "free" };
      const payload: AttemptPayload = { session: session.code, team, game };
      // A start never overtakes the queued items, so a queued start cannot arrive after a later one.
      if ((await flushPending()) > 0) { savePending([...pending(), { kind: "start", ...payload }]); return { status: "queued" }; }
      try {
        const reply = await gateway.startAttempt(payload);
        if (reply.ok && reply.body) return { status: "counted", attempt: reply.body.attempt, limit: reply.body.limit };
        if (reply.status === HTTP_CONFLICT) return { status: "exhausted" };
        if (reply.ok || reply.status >= HTTP_SERVER_ERROR) throw new Error("unreadable or failed reply");
        return { status: reply.status === HTTP_FORBIDDEN ? "closed" : reply.status === HTTP_NOT_FOUND ? "gone" : "fail" };
      } catch {
        savePending([...pending(), { kind: "start", ...payload }]);
        return { status: "queued" };
      }
    },

    /**
     * Sends the score to the session ranking. Offline, it is stored and re-sent when the connection is back.
     * A score never overtakes the queued items: the server needs the start before the score.
     */
    async submit(team: string, game: string, score: number, tags: string[] = []): Promise<SubmitResult> {
      const session = membership.current();
      if (!session) return "nosession";
      const payload: ScorePayload = { session: session.code, team, game, score, avatar: profile.avatar(), tags };
      if ((await flushPending()) > 0) { savePending([...pending(), payload]); return "queued"; }
      const result = await send(payload);
      if (result === "unreachable") { savePending([...pending(), payload]); return "queued"; }
      return result;
    },

    flushPending,
    pendingCount: () => pending().length,
  };
}

export type ScoreSubmitter = ReturnType<typeof createScoreSubmitter>;
