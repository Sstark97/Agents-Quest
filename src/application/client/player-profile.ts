import { AVATAR_COUNT, TEAM_NAME_MAX } from "../../domain/session/score-submission";
import type { KeyValueStore } from "./ports";
import { STORAGE_KEYS } from "./storage-keys";

/** Who is playing on this device: team name and chosen robot. */
export function createPlayerProfile(store: KeyValueStore) {
  return {
    teamName: () => store.read(STORAGE_KEYS.team),
    renameTeam: (name: string) => store.write(STORAGE_KEYS.team, name.trim().slice(0, TEAM_NAME_MAX)),
    avatar: () => Math.max(0, Math.min(AVATAR_COUNT - 1, Number(store.read(STORAGE_KEYS.avatar)) || 0)),
    chooseAvatar: (avatar: number) => store.write(STORAGE_KEYS.avatar, String(avatar)),
  };
}

export type PlayerProfile = ReturnType<typeof createPlayerProfile>;
