"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAttemptStart } from "@/src/ui/hooks/useAttemptStart";
import { PLAY_STATUS_POLL_MS, usePlayStatus } from "@/src/ui/hooks/usePlayStatus";
import { Practice } from "@/src/ui/practice/Practice";
import { AttemptNotice } from "./AttemptNotice";
import { startLabel } from "./attempt-text";
import { PlayRules } from "./PlayRules";

type Props = { gameId: string; title: string; subtitle: string; team: string; onStart: () => void; facts?: ReactNode[]; game?: string; children: ReactNode };

/** Opening screen of a level: rules, playable practice and quick facts (scoring and shortcuts). */
export function LevelIntro({ gameId, title, subtitle, team, onStart, facts, game, children }: Props) {
  const play = usePlayStatus(team, { pollMs: PLAY_STATUS_POLL_MS });
  const { notice, busy, begin } = useAttemptStart(gameId, team, play.refresh);
  const left = play.view.state === "none" ? null : play.view.status.games[gameId]?.left ?? null;
  const exhausted = play.view.state === "live" && left === 0;
  return (
    <>
      <h1 className="glow"><i className="sp robot logo" />{title}</h1>
      <h2>{subtitle}</h2>
      <p className="muted">Equipo: <strong style={{ color: "var(--gold)" }}>{team || "(sin nombre)"}</strong></p>
      <div className="card">
        <PlayRules game={gameId} view={play.view} hasPractice={!!game} />
        {children}
        {game && <Practice game={game} />}
        {facts && <ul className="facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
        <AttemptNotice busy={busy} notice={notice} />
        <div className="row">
          {team ? (!exhausted && <button className="btn start" onClick={() => begin(onStart)} disabled={busy}>{left === null ? "PRESS START" : startLabel(left)}</button>) : <Link className="btn" href="/">Primero pon nombre a tu equipo</Link>}
          <Link className="btn ghost" href="/">← MENU</Link>
        </div>
      </div>
    </>
  );
}
