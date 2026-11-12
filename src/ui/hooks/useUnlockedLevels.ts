"use client";
import { useEffect, useState } from "react";
import type { JoinedSession } from "@/src/application/client/session-membership";
import { GAMES } from "@/src/domain/games/catalog";
import { useServices } from "@/src/ui/services-context";

type UnlockedLevels = { unlocked: number; loading: boolean; session: JoinedSession | null };

/** Levels the facilitator opened in the current session; refreshes itself. `loading` until the first read. */
export function useUnlockedLevels(pollMs = 4000) {
  const { membership, levelAccess } = useServices();
  const [state, setState] = useState<UnlockedLevels>({ unlocked: 0, loading: true, session: null });
  useEffect(() => {
    let alive = true;
    const load = async () => {
      await Promise.resolve(); // lets other effects (e.g. ?todos=1) write before reading
      if (!alive) return;
      const session = membership.current();
      if (levelAccess.allUnlocked()) { setState({ unlocked: GAMES.length, loading: false, session }); return; }
      if (!session) { setState({ unlocked: 0, loading: false, session: null }); return; }
      const unlocked = await levelAccess.refreshUnlocked(session.code);
      if (alive) setState({ unlocked: unlocked ?? levelAccess.cachedUnlocked(session.code), loading: false, session });
    };
    load();
    const timer = setInterval(load, pollMs);
    return () => { alive = false; clearInterval(timer); };
  }, [pollMs, membership, levelAccess]);
  return state;
}
