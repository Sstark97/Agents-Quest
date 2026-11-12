/**
 * Keys of everything kept on the player's device. They are persisted, so the original
 * names stay even though the rest of the code is in English.
 */
export const STORAGE_KEYS = {
  team: "taller.team",
  avatar: "taller.avatar",
  session: "taller.session",
  facilitatorSessions: "taller.admin",
  unlockAll: "taller.unlockall",
  pendingScores: "taller.queue",
  scores: "taller.scores",
  medals: "taller.medals",
  plays: "taller.plays",
  unlockedLevels: "taller.unlocked",
} as const;

/** Progress is per session: every session code has its own entries ("_" = no session). */
export const scopedKey = (key: string, sessionCode: string | undefined) => `${key}.${sessionCode ?? "_"}`;

/** Parses stored JSON, falling back when it is missing or corrupt. */
export function parseStored<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw || JSON.stringify(fallback)); } catch { return fallback; }
}
