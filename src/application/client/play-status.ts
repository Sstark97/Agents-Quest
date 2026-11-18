import type { PlayStatus } from "../../domain/session/play-status";
import { sanitizeTeamName } from "../../domain/session/score-submission";
import type { SessionGateway } from "./ports";
import type { SessionMembership } from "./session-membership";

/** "none": nothing to show. "live": fresh from the server. "offline": the last known status, the server was not reachable. */
export type PlayStatusView = { state: "none" } | { state: "live" | "offline"; status: PlayStatus };

const NONE: PlayStatusView = { state: "none" };
const HTTP_SERVER_ERROR = 500;

/** Reads the attempts and bonuses of the team from the server and remembers the last answer (in memory only). */
export function createPlayStatusReader(gateway: SessionGateway, membership: SessionMembership) {
  const cache = new Map<string, PlayStatus>();
  const keyOf = (code: string, team: string) => `${code}|${sanitizeTeamName(team)}`;
  const target = (team: string) => {
    const session = membership.current();
    const name = sanitizeTeamName(team);
    return session && name ? { code: session.code, team: name, key: keyOf(session.code, name) } : null;
  };
  const offline = (key: string): PlayStatusView => {
    const status = cache.get(key);
    return status ? { state: "offline", status } : NONE;
  };

  return {
    /** Last known status, without any request. */
    peek(team: string): PlayStatusView {
      const found = target(team);
      return found ? offline(found.key) : NONE;
    },

    /** Asks the server. Never rejects. */
    async read(team: string): Promise<PlayStatusView> {
      const found = target(team);
      if (!found) return NONE;
      try {
        const reply = await gateway.getPlayStatus(found.code, found.team);
        if (reply.ok && reply.body?.status) {
          cache.set(found.key, reply.body.status);
          return { state: "live", status: reply.body.status };
        }
        if (reply.ok ? !reply.body : reply.status >= HTTP_SERVER_ERROR) return offline(found.key);
        cache.delete(found.key);
        return NONE;
      } catch {
        return offline(found.key);
      }
    },
  };
}

export type PlayStatusReader = ReturnType<typeof createPlayStatusReader>;
