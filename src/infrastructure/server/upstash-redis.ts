/** Minimal Upstash Redis client over its REST API: one command per request. */
export type RedisCommand = (command: (string | number)[]) => Promise<unknown>;

export function createRedisCommand(url: string, token: string): RedisCommand {
  return async (command) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(command),
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`redis ${response.status}`);
    return ((await response.json()) as { result: unknown }).result;
  };
}

/** HGETALL answers a flat [field, value, field, value...] list. */
export function toRecord(flat: string[]) {
  const record: Record<string, string> = {};
  for (let i = 0; i < flat.length; i += 2) record[flat[i]] = flat[i + 1];
  return record;
}
