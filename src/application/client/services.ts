import { createFacilitator } from "./facilitator";
import { createLeaderboard } from "./leaderboard";
import { createLevelAccess } from "./level-access";
import { createLocalProgress } from "./local-progress";
import { createPlayerProfile } from "./player-profile";
import type { KeyValueStore, SessionGateway } from "./ports";
import { createScoreSubmitter } from "./score-submitter";
import { createSessionMembership } from "./session-membership";

/** Everything the interface can ask the application to do, built on top of the two client ports. */
export function createClientServices(store: KeyValueStore, gateway: SessionGateway) {
  const profile = createPlayerProfile(store);
  const membership = createSessionMembership(store, gateway, profile);
  return {
    profile,
    membership,
    progress: createLocalProgress(store, membership),
    scores: createScoreSubmitter(store, gateway, membership, profile),
    levelAccess: createLevelAccess(store, gateway),
    facilitator: createFacilitator(store, gateway),
    leaderboard: createLeaderboard(gateway),
  };
}

export type ClientServices = ReturnType<typeof createClientServices>;
