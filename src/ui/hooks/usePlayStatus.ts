"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PlayStatusView } from "@/src/application/client/play-status";
import { useServices } from "@/src/ui/services-context";

export const PLAY_STATUS_POLL_MS = 5000;
/** Wait after the last change of the team name before asking the server (the menu updates it per keystroke). */
const TEAM_DEBOUNCE_MS = 400;
const NONE: PlayStatusView = { state: "none" };

type Options = { pollMs?: number; enabled?: boolean };

/** Attempts and bonuses of the team, straight from the server. `refresh` asks again right away. */
export function usePlayStatus(team: string, { pollMs, enabled = true }: Options = {}) {
  const { playStatus } = useServices();
  const [view, setView] = useState<PlayStatusView>(NONE);
  const alive = useRef(true);
  const requestId = useRef(0);
  const teamRef = useRef(team);
  teamRef.current = team;

  const load = useCallback(async () => {
    const id = ++requestId.current;
    const found = await playStatus.read(teamRef.current);
    if (alive.current && id === requestId.current) setView(found);
  }, [playStatus]);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);

  useEffect(() => {
    if (!enabled) return;
    requestId.current++; // a reply for the previous name must not overwrite this one
    setView(playStatus.peek(team));
    const timer = setTimeout(load, TEAM_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [team, enabled, playStatus, load]);

  useEffect(() => {
    if (!enabled || !pollMs) return;
    const timer = setInterval(() => { if (!document.hidden) load(); }, pollMs);
    const onVisible = () => { if (!document.hidden) load(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", onVisible); };
  }, [enabled, pollMs, load]);

  const refresh = useCallback(() => { if (enabled) load(); }, [enabled, load]);
  return { view, refresh };
}
