/** Island the robot stood on during the last visit to the map (per browser tab), so it can walk to the new one. */
const KEY = "taller.here";

/** Stores the current island and returns the previous one, or null on the first visit or without storage. */
export function swapLastMapPosition(current: number): number | null {
  try {
    const stored = sessionStorage.getItem(KEY);
    sessionStorage.setItem(KEY, String(current));
    return stored === null ? null : Number(stored);
  } catch {
    return null;
  }
}
