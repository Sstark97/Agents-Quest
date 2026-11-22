"use client";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { FacilitatorSession, SessionStatus } from "@/src/application/client/facilitator";
import type { ScoreBoard } from "@/src/domain/games/progress";
import { DEFAULT_ATTEMPT_LIMIT, SESSION_NAME_MAX } from "@/src/domain/session/session";
import type { Stats } from "@/src/domain/session/stats";
import { useServices } from "@/src/ui/services-context";
import { downloadText } from "@/src/ui/components/download-text";
import { AttemptControl, attemptsHelp } from "./AttemptControl";
import { ClassStats } from "./ClassStats";
import { EmailControl } from "./EmailControl";
import { LevelControl } from "./LevelControl";

const REFRESH_MS = 8000;
type SessionAction = "close" | "open" | "reset" | "delete";
const DONE_MESSAGE: Record<Exclude<SessionAction, "delete">, string> = { reset: "Puntuaciones borradas.", close: "Sesión cerrada.", open: "Sesión reabierta." };

/** Facilitator's panel: create sessions, open levels and see how the class is doing. */
export function FacilitatorScreen() {
  const { facilitator, leaderboard } = useServices();
  const [name, setName] = useState("");
  const [sessions, setSessions] = useState<FacilitatorSession[]>([]);
  const [selected, setSelected] = useState<FacilitatorSession | null>(null);
  const [status, setStatus] = useState<SessionStatus>(null);
  const [origin, setOrigin] = useState("");
  const [message, setMessage] = useState("");
  const [newAttempts, setNewAttempts] = useState(DEFAULT_ATTEMPT_LIMIT);
  const [newCollectEmails, setNewCollectEmails] = useState(false);
  const [emailCount, setEmailCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [teams, setTeams] = useState<{ games: ScoreBoard }[]>([]);

  const reloadSessions = () => { const list = facilitator.sessions(); setSessions(list); return list; };

  useEffect(() => { setOrigin(window.location.origin); setSelected(reloadSessions()[0] ?? null); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  useEffect(() => {
    if (!selected) { setStatus(null); return; }
    facilitator.status(selected.code).then(setStatus);
  }, [selected, facilitator]);

  useEffect(() => {
    if (!selected || status === "gone") { setStats(null); setEmailCount(null); return; }
    let alive = true;
    const load = () => {
      leaderboard.stats(selected.code).then((reply) => { if (alive && (reply.body || !reply.ok)) setStats(reply.body); }).catch(() => {});
      leaderboard.ranking(selected.code).then((reply) => alive && reply.body && setTeams(reply.body.teams)).catch(() => {});
      facilitator.emailCount(selected).then((count) => { if (alive && count !== null) setEmailCount(count); });
    };
    load();
    const timer = setInterval(load, REFRESH_MS);
    return () => { alive = false; clearInterval(timer); };
  }, [selected, status, leaderboard, facilitator]);

  const create = async () => {
    if (!name.trim()) return;
    setBusy(true); setMessage("");
    const outcome = await facilitator.createSession(name, newAttempts, newCollectEmails);
    if (outcome.ok) { reloadSessions(); setSelected(outcome.session); setName(""); setNewCollectEmails(false); }
    else setMessage(outcome.reason === "rejected" ? "No se pudo crear la sesión." : "No se pudo conectar.");
    setBusy(false);
  };

  const forget = (code: string) => {
    facilitator.forget(code);
    setSelected(reloadSessions()[0] ?? null);
  };

  const setLevel = async (level: number) => {
    if (!selected) return;
    if (await facilitator.act(selected, "unlock", { level })) setStatus((current) => (current && current !== "gone" ? { ...current, unlocked: level } : current));
    else setMessage("No se pudo cambiar el nivel.");
  };

  const setAttempts = async (attempts: number) => {
    if (!selected) return;
    if (await facilitator.act(selected, "attempts", { attempts })) setStatus((current) => (current && current !== "gone" ? { ...current, attemptLimit: attempts } : current));
    else setMessage("No se pudo cambiar el límite.");
  };

  const setCollectEmails = async (enabled: boolean) => {
    if (!selected) return;
    if (await facilitator.act(selected, "emails", { enabled })) setStatus((current) => (current && current !== "gone" ? { ...current, collectEmails: enabled } : current));
    else setMessage("No se pudo cambiar la opción de correos.");
  };

  const downloadEmails = async () => {
    if (!selected) return;
    const outcome = await facilitator.exportEmails(selected);
    if (outcome.ok) downloadText(outcome.fileName, outcome.csv);
    else setMessage(outcome.reason === "rejected" ? "No se pudo descargar los correos." : "No se pudo conectar.");
  };

  const act = async (action: SessionAction) => {
    if (!selected) return;
    if (action === "reset" && !window.confirm("¿Borrar todas las puntuaciones de esta sesión? No se puede deshacer.")) return;
    if (action === "delete" && !window.confirm(`¿Eliminar la sesión «${selected.name}» (${selected.code}) y todas sus puntuaciones y todos sus correos? No se puede deshacer.`)) return;
    const done = await facilitator.act(selected, action);
    if (!done) { setMessage("No se pudo completar la acción."); return; }
    if (action === "delete") { forget(selected.code); setMessage("Sesión eliminada."); return; }
    setMessage(DONE_MESSAGE[action]);
    if (action === "close" || action === "open") setStatus((current) => (current && current !== "gone" ? { ...current, closed: action === "close" } : current));
  };

  const joinUrl = selected ? `${origin}/?c=${selected.code}` : "";
  const rankingUrl = selected ? `${origin}/ranking?s=${selected.code}` : "";

  return (
    <>
      <h1 className="glow">PANEL DEL FORMADOR</h1>
      <div className="card">
        <h2>NUEVA SESION</h2>
        <input placeholder="Taller ULPGC" value={name} maxLength={SESSION_NAME_MAX} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => event.key === "Enter" && create()} />
        <div className="muted">INTENTOS POR NIVEL</div>
        <AttemptControl value={newAttempts} onChange={setNewAttempts} />
        <p className="muted">{attemptsHelp(newAttempts)}</p>
        <label className="consent">
          <input type="checkbox" checked={newCollectEmails} onChange={(event) => setNewCollectEmails(event.target.checked)} />
          <span>Pedir correo al unirse (opcional para los equipos)</span>
        </label>
        <p><button className="btn start" onClick={create} disabled={busy || !name.trim()}>CREAR SESION</button></p>
        {message && <p className="muted">{message}</p>}
      </div>

      {sessions.length > 0 && (
        <div className="card">
          <h2>MIS SESIONES</h2>
          <div className="row" style={{ marginBottom: 12 }}>
            {sessions.map((session) => <button key={session.code} className={`btn ${selected?.code === session.code ? "" : "ghost"}`} onClick={() => { setSelected(session); setMessage(""); }}>{session.name}</button>)}
          </div>
          {selected && (
            <>
              <div className="muted">CÓDIGO PARA LOS EQUIPOS</div>
              <div className="big">{selected.code}</div>
              <div className="sessgrid">
                <div className="qr"><QRCodeSVG value={joinUrl} size={168} /></div>
                <div>
                  <p>Enlace para unirse:<br /><code>{joinUrl}</code></p>
                  <p>Ranking para proyectar:<br /><Link href={`/ranking?s=${selected.code}`} target="_blank"><code>{rankingUrl}</code></Link></p>
                  <p><Link className="btn start" href={`/tv?s=${selected.code}`} target="_blank">PANTALLA PROYECTOR</Link></p>
                  <p className="muted">Estado: {status === "gone" ? "YA NO EXISTE (caducó o se eliminó)" : status ? (status.closed ? "CERRADA (no admite puntuaciones)" : "ABIERTA") : "..."}</p>
                </div>
              </div>
              {status && status !== "gone" && <LevelControl unlocked={status.unlocked} onChange={setLevel} />}
              {status && status !== "gone" && (
                <div className="levelctl">
                  <h2>INTENTOS POR NIVEL</h2>
                  {status.attemptLimit === null
                    ? <p className="muted">Sin límite: sesión creada antes de los intentos.</p>
                    : <><p className="muted">{attemptsHelp(status.attemptLimit)}</p><AttemptControl value={status.attemptLimit} onChange={setAttempts} /></>}
                </div>
              )}
              {status && status !== "gone" && <EmailControl enabled={status.collectEmails} count={emailCount} onToggle={setCollectEmails} onDownload={downloadEmails} />}
              <div className="row">
                {status === "gone" ? <button className="btn ghost" onClick={() => forget(selected.code)}>QUITAR DE LA LISTA</button> : <>
                {status?.closed ? <button className="btn" onClick={() => act("open")}>REABRIR</button> : <button className="btn ghost" onClick={() => act("close")}>CERRAR SESION</button>}
                <button className="btn ghost" onClick={() => act("reset")}>REINICIAR PUNTUACIONES</button>
                <button className="btn danger" onClick={() => act("delete")}>ELIMINAR SESION</button>
                </>}
              </div>
              {stats && <ClassStats stats={stats} teams={teams} />}
              <p className="muted">La clave de formador se guarda solo en este navegador. Si cambias de equipo, perderás el control de esta sesión.</p>
            </>
          )}
        </div>
      )}
      <p className="muted">Para probar todos los niveles sin abrirlos en una sesión: abre <code>/?todos=1</code> (y <code>/?todos=0</code> para quitarlo).</p>
      <Link href="/">&lt; Volver</Link>
    </>
  );
}
