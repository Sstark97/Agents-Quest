"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/src/domain/games/catalog";
import type { TeamRow } from "@/src/domain/session/ranking";
import type { SessionInfo } from "@/src/domain/session/session";
import { Avatar } from "@/src/ui/components/Avatar";
import { useSessionCode } from "@/src/ui/hooks/useSessionCode";
import { useServices } from "@/src/ui/services-context";

const REFRESH_MS = 4000;
const CONNECTION_ERROR = "Sin conexión con el servidor";

/** Ranking of a session, refreshed on its own. */
export function RankingScreen() {
  const { leaderboard } = useServices();
  const code = useSessionCode();
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [teams, setTeams] = useState<TeamRow[]>([]);
  const [persistent, setPersistent] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!code) return;
    let alive = true;
    const load = async () => {
      try {
        const reply = await leaderboard.ranking(code);
        if (!alive) return;
        if (reply.status === 404) { setError("No existe ninguna sesión con ese código."); return; }
        if (!reply.body) { setError(CONNECTION_ERROR); return; }
        setInfo(reply.body.session); setTeams(reply.body.teams); setPersistent(reply.body.persistent); setError("");
      } catch { if (alive) setError(CONNECTION_ERROR); }
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [code, leaderboard]);

  if (code === null) return null;
  if (!code) {
    return (
      <>
        <h1 className="glow">RANKING</h1>
        <p className="muted">Cada ranking pertenece a una sesión. <Link href="/">Únete con el código de tu formador</Link>.</p>
      </>
    );
  }

  return (
    <>
      <h1 className="glow">RANKING</h1>
      <p className="muted">{info ? <>Sesión <strong style={{ color: "var(--gold)" }}>{info.name}</strong> · código {info.code}{info.closed ? " · CERRADA" : ""}</> : `Sesión ${code}`} · se actualiza solo.</p>
      {error && <p className="fb bad">{error}</p>}
      {!persistent && <p className="muted">Modo memoria: el ranking se pierde al reiniciar el servidor (configura Upstash Redis).</p>}
      <div className="card">
        <table className="rank-big">
          <thead>
            <tr><th>#</th><th>Equipo</th>{GAMES.map((game) => <th className="num" key={game.id}>{game.short}</th>)}<th className="num">Total</th></tr>
          </thead>
          <tbody>
            {teams.length === 0 && <tr><td colSpan={3 + GAMES.length} className="muted">Aún no hay puntuaciones.</td></tr>}
            {teams.map((row, i) => (
              <tr key={row.team} className={i === 0 ? "first" : ""}>
                <td>{i + 1}º</td>
                <td><Avatar n={row.avatar ?? 0} size={22} /> {row.team}</td>
                {GAMES.map((game) => <td className="num" key={game.id}>{row.games[game.id] ?? "–"}</td>)}
                <td className="num"><strong>{row.total}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p><Link href="/">&lt; Volver</Link> · <Link href={`/tv?s=${code}`} target="_blank">Modo proyector &gt;</Link></p>
    </>
  );
}
