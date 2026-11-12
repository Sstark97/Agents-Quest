"use client";
import Link from "next/link";
import type { ReactNode } from "react";
import { Practice } from "@/src/ui/practice/Practice";

type Props = { title: string; subtitle: string; team: string; onStart: () => void; facts?: ReactNode[]; game?: string; children: ReactNode };

/** Opening screen of a level: rules, playable practice and quick facts (scoring and shortcuts). */
export function LevelIntro({ title, subtitle, team, onStart, facts, game, children }: Props) {
  return (
    <>
      <h1 className="glow"><i className="sp robot logo" />{title}</h1>
      <h2>{subtitle}</h2>
      <p className="muted">Equipo: <strong style={{ color: "var(--gold)" }}>{team || "(sin nombre)"}</strong></p>
      <div className="card">
        {children}
        {game && <Practice game={game} />}
        {facts && <ul className="facts">{facts.map((fact, index) => <li key={index}>{fact}</li>)}</ul>}
        <div className="row">
          {team ? <button className="btn start" onClick={onStart}>PRESS START</button> : <Link className="btn" href="/">Primero pon nombre a tu equipo</Link>}
          <Link className="btn ghost" href="/">← MENU</Link>
        </div>
      </div>
    </>
  );
}
