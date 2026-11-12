import type { ScoreBoard } from "../../domain/games/progress";
import type { KeyValueStore } from "./ports";
import type { SessionMembership } from "./session-membership";
import { STORAGE_KEYS, parseStored, scopedKey } from "./storage-keys";

/** Scores, medals and play counts of this device, kept per session. */
export function createLocalProgress(store: KeyValueStore, membership: SessionMembership) {
  const key = (name: string) => scopedKey(name, membership.current()?.code);
  const scores = () => parseStored<ScoreBoard>(store.read(key(STORAGE_KEYS.scores)), {});
  const medals = () => parseStored<string[]>(store.read(key(STORAGE_KEYS.medals)), []);

  return {
    scores,

    /** Keeps the best local score of a game. */
    saveScore(game: string, score: number) {
      const all = scores();
      all[game] = Math.max(all[game] ?? 0, score);
      store.write(key(STORAGE_KEYS.scores), JSON.stringify(all));
    },

    /** Medals earned so far, as "game:medal". */
    medals,

    /** Stores the medals and returns the ones that are new. */
    awardMedals(game: string, ids: string[]): string[] {
      const owned = new Set(medals());
      const fresh = ids.filter((id) => !owned.has(`${game}:${id}`));
      fresh.forEach((id) => owned.add(`${game}:${id}`));
      store.write(key(STORAGE_KEYS.medals), JSON.stringify([...owned]));
      return fresh;
    },

    /** Counts a finished play of a level and returns how many there are now. */
    countPlay(game: string): number {
      const plays = parseStored<Record<string, number>>(store.read(key(STORAGE_KEYS.plays)), {});
      plays[game] = (plays[game] ?? 0) + 1;
      store.write(key(STORAGE_KEYS.plays), JSON.stringify(plays));
      return plays[game];
    },
  };
}

export type LocalProgress = ReturnType<typeof createLocalProgress>;
