/** Deterministic seed from a text (team + session), so levels vary between teams but not between retries. */
export function hash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

/** Mulberry32 generator: returns numbers in [0, 1). */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const seededRandom = (seed: string) => mulberry32(hash(seed));

/** Fisher-Yates shuffle driven by a seed: same seed, same order. */
export function seedOrder<T>(items: T[], seed: string): T[] {
  const random = seededRandom(seed), result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}

/** Seed shared by every level: the team name plus the session it plays in. */
export const teamSeed = (team: string, sessionCode: string | undefined) => `${team}:${sessionCode ?? ""}`;
