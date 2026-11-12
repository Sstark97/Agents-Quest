import type { SessionGateway } from "./ports";

/** Read side of a session: its ranking and its most common mistakes. Both reject when there is no connection. */
export function createLeaderboard(gateway: SessionGateway) {
  return {
    ranking: (code: string) => gateway.getRanking(code),
    stats: (code: string) => gateway.getStats(code),
  };
}

export type Leaderboard = ReturnType<typeof createLeaderboard>;
