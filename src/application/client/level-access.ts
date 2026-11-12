import type { KeyValueStore, SessionGateway } from "./ports";
import { STORAGE_KEYS } from "./storage-keys";

/** Which levels this device may play: the ones the facilitator opened, or all of them in facilitator mode. */
export function createLevelAccess(store: KeyValueStore, gateway: SessionGateway) {
  const cacheKey = (code: string) => `${STORAGE_KEYS.unlockedLevels}.${code}`;

  return {
    /** Facilitator mode: /?todos=1 skips the level lock (and /?todos=0 restores it). */
    allUnlocked: () => store.read(STORAGE_KEYS.unlockAll) === "1",
    setAllUnlocked(on: boolean) { if (on) store.write(STORAGE_KEYS.unlockAll, "1"); else store.remove(STORAGE_KEYS.unlockAll); },

    /** Last known number of open levels, for when there is no connection. */
    cachedUnlocked: (code: string) => Number(store.read(cacheKey(code))) || 0,

    /** Asks the server how many levels are open. Null when it cannot be known right now. */
    async refreshUnlocked(code: string): Promise<number | null> {
      try {
        const reply = await gateway.findSession(code);
        if (!reply.ok || !reply.body) return reply.status === 404 ? 0 : null;
        const unlocked = Number(reply.body.unlocked) || 0;
        store.write(cacheKey(code), String(unlocked));
        return unlocked;
      } catch {
        return null;
      }
    },
  };
}

export type LevelAccess = ReturnType<typeof createLevelAccess>;
