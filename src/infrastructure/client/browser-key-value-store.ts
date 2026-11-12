import type { KeyValueStore } from "../../application/client/ports";

/** localStorage adapter. Storage can be unavailable (server render, private mode): then it behaves as empty. */
export const browserKeyValueStore: KeyValueStore = {
  read(key) { try { return localStorage.getItem(key) ?? ""; } catch { return ""; } },
  write(key, value) { try { localStorage.setItem(key, value); } catch { /* storage unavailable */ } },
  remove(key) { try { localStorage.removeItem(key); } catch { /* storage unavailable */ } },
};
