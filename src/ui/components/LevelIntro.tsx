"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { useAttemptStart } from "@/src/ui/hooks/useAttemptStart";
import { Practice } from "@/src/ui/practice/Practice";
import { AttemptNotice } from "./AttemptNotice";

type Props = { gameId: string; title: string; subtitle: string; team: string; onStart: () => void; facts?: ReactNode[]; game?: string; children: ReactNode };

/** Opening screen of a level: rules, playable practice and quick facts (scoring and shortcuts). */
export function LevelIntro({ gameId, title, subtitle, team, onStart, facts, game, children }: Props) {
  const { notice, busy, begin } = useAttemptStart(gameId, team);
  return (
    <>
      <h1 className="glow"><i className="sp robot logo" />{title}</h1>
      <h2>{subtitle}</h2>
      <p className="muted">Equipo: <strong style={{ color: "var(--gold)" }}>{team || "(sin nombre)"}</strong></p>
      <div className="card">
        {children}
        {game && <Practice game={game} />}
        {facts && <ul className="facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
        <AttemptNotice busy={busy} notice={notice} />
        <div className="row">
          {team ? <button className="btn start" onClick={() => begin(onStart)} disabled={busy}>PRESS START</button> : <Link className="btn" href="/">Primero pon nombre a tu equipo</Link>}
          <Link className="btn ghost" href="/">← MENU</Link>
        </div>
      </div>
    </>
  );
}
