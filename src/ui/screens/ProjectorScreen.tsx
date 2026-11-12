"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useRef, useState } from "react";
import { GAMES, findGame } from "@/src/domain/games/catalog";
import { currentLevelIndex, passScore } from "@/src/domain/games/progress";
import type { TeamRow } from "@/src/domain/session/ranking";
import { shareOfPlays, type Stats } from "@/src/domain/session/stats";
import { Avatar } from "@/src/ui/components/Avatar";
import { useSessionCode } from "@/src/ui/hooks/useSessionCode";
import { useServices } from "@/src/ui/services-context";

const REFRESH_MS = 3000, MOVE_MARK_MS = 4000, TIP_ROTATION_MS = 7000;
const MAX_TIPS = 6, MAX_AVATARS_PER_ISLAND = 12, ROW_HEIGHT_PX = 56;
/** Podium order on screen: second, first, third. */
const PODIUM = [{ index: 1, place: 2 }, { index: 0, place: 1 }, { index: 2, place: 3 }];
type Move = "up" | "down";

/** Live ranking meant to be projected in the room. */
export function ProjectorScreen() {
  const { leaderboard } = useServices();
  const code = useSessionCode();
  const [name, setName] = useState("");
  const [unlocked, setUnlocked] = useState(0);
  const [closed, setClosed] = useState(false);
  const [rows, setRows] = useState<TeamRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [origin, setOrigin] = useState("");
  const [tip, setTip] = useState(0);
  const [moves, setMoves] = useState<Record<string, Move>>({});
  const previousPlaces = useRef<Record<string, number>>({});

  useEffect(() => setOrigin(window.location.origin), []);

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const load = async () => {
      try {
        const [ranking, statsReply] = await Promise.all([leaderboard.ranking(code), leaderboard.stats(code)]);
        if (!alive || !ranking.body) return;
        const list = [...ranking.body.teams].sort((a, b) => b.total - a.total);
        const moved: Record<string, Move> = {};
        list.forEach((row, place) => {
          const previous = previousPlaces.current[row.team];
          if (previous !== undefined && previous !== place) moved[row.team] = place < previous ? "up" : "down";
          previousPlaces.current[row.team] = place;
        });
        const { session } = ranking.body;
        setRows(list); setName(session.name); setUnlocked(session.unlocked ?? 0); setClosed(Boolean(session.closed));
        if (Object.keys(moved).length) { setMoves(moved); setTimeout(() => alive && setMoves({}), MOVE_MARK_MS); }
        if (statsReply.body) setStats(statsReply.body);
      } catch { /* retried on the next cycle */ }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [code, leaderboard]);

  const tips = (stats?.tags ?? []).filter((counter) => stats!.plays[counter.game]).slice(0, MAX_TIPS);
  useEffect(() => { const timer = setInterval(() => setTip((current) => current + 1), TIP_ROTATION_MS); return () => clearInterval(timer); }, []);

  if (code === null) return null;
  if (!code) return <p className="muted">Abre esta pantalla desde el panel del formador. <Link href="/sesion/nueva">Ir al panel</Link></p>;

  const podium = PODIUM.map(({ index, place }) => ({ row: rows[index], place }));
  const rest = rows.slice(3);
  const currentTip = tips.length ? tips[tip % tips.length] : null;
  const gameTitle = (id: string) => findGame(id)?.title ?? id;

  return (
    <div className="tv">
      <header className="tvhead">
        <div>
          <h1 className="glow"><i className="sp robot logo" />AGENT QUEST</h1>
          <p className="tvsub">{name || "..."} {closed ? <span className="live off">■ SESIÓN CERRADA</span> : <span className="live">● EN VIVO</span>}</p>
          <p className="tvlevel">{closed ? <strong>CLASIFICACIÓN FINAL</strong> : unlocked === 0 ? "Esperando al formador..." : <>NIVEL ABIERTO: <strong>{GAMES[unlocked - 1].title}</strong></>}</p>
        </div>
        <div className="tvjoin">
          <div><div className="muted">ÚNETE</div><div className="tvcode">{code}</div><div className="muted">{origin.replace(/^https?:\/\//, "")}</div></div>
          {origin && <div className="qr"><QRCodeSVG value={`${origin}/?c=${code}`} size={120} /></div>}
        </div>
      </header>

      {rows.length > 0 && (
        <div className="tvisles" style={{ gridTemplateColumns: `repeat(${GAMES.length + 1}, 1fr)` }}>
          {[...GAMES.map((game) => game.short), "META"].map((label, i) => {
            const here = rows.filter((row) => currentLevelIndex(row.games, unlocked) === i);
            const open = i < unlocked || i === GAMES.length;
            return (
              <div key={label} className={`tvisle ${open ? "open" : ""} ${i === unlocked - 1 ? "now" : ""}`}>
                <div className="tvisleteams">{here.slice(0, MAX_AVATARS_PER_ISLAND).map((row) => <span key={row.team} title={row.team}><Avatar n={row.avatar ?? 0} size={28} /></span>)}{here.length > MAX_AVATARS_PER_ISLAND && <em>+{here.length - MAX_AVATARS_PER_ISLAND}</em>}</div>
                <b>{label}</b>
                <small>{here.length} equipo{here.length === 1 ? "" : "s"}</small>
              </div>
            );
          })}
        </div>
      )}

      {currentTip && stats && !closed && (
        <div className="tvtip" key={tip % tips.length}>
          <span className="muted">LO QUE MÁS SE ESTÁ FALLANDO · {gameTitle(currentTip.game)}</span>
          <strong>{currentTip.tag}</strong>
          <em>{shareOfPlays(currentTip.count, stats.plays[currentTip.game])}% de los equipos</em>
        </div>
      )}

      {rows.length === 0 ? <p className="tvempty">Esperando a los primeros equipos...</p> : (
        <>
          {closed && <h2 className="tvfinal glow">♛ PODIO FINAL ♛</h2>}
          <div className={`podium ${closed ? "final" : ""}`}>
            {podium.map(({ row, place }) => (
              <div key={place} className={`pod p${place}`}>
                {row ? <>
                  {place === 1 && <span className="crown">♛</span>}
                  <Avatar n={row.avatar ?? 0} size={place === 1 ? 72 : 56} />
                  <strong className="podname">{row.team}</strong>
                  <em className="podpts">{row.total}</em>
                </> : <span className="muted">—</span>}
                <div className="podbar"><b>{place}</b></div>
              </div>
            ))}
          </div>
          <ol className="tvlist" style={{ height: `${rest.length * ROW_HEIGHT_PX}px` }}>
            {rest.map((row, i) => (
              <li key={row.team} className={moves[row.team] ?? ""} style={{ transform: `translateY(${i * ROW_HEIGHT_PX}px)` }}>
                <b>{i + 4}º</b>
                <span className="tvteam"><Avatar n={row.avatar ?? 0} size={30} /> {row.team}</span>
                <span className="lvpips">{GAMES.map((game) => <i key={game.id} className={(row.games[game.id] ?? 0) >= passScore(game) ? "ok" : row.games[game.id] ? "mid" : ""} title={game.title} />)}</span>
                <em>{row.total}</em>
                {moves[row.team] && <span className="mv">{moves[row.team] === "up" ? "▲" : "▼"}</span>}
              </li>
            ))}
          </ol>
        </>
      )}

    </div>
  );
}
