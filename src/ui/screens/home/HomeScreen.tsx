"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { type EmailSubmitResult } from "@/src/application/client/email-collector";
import { hasJoinDetails, type JoinResult, type JoinedSession } from "@/src/application/client/session-membership";
import { GAMES } from "@/src/domain/games/catalog";
import { levelStates, type ScoreBoard } from "@/src/domain/games/progress";
import { sfx } from "@/src/ui/audio/sound";
import { usePlayStatus } from "@/src/ui/hooks/usePlayStatus";
import { useUnlockedLevels } from "@/src/ui/hooks/useUnlockedLevels";
import { useServices } from "@/src/ui/services-context";
import { LevelList } from "./LevelList";
import { JoinSessionCard, JoinedSessionCard } from "./SessionCard";
import { SPOTS, WorldMap } from "./WorldMap";
import { swapLastMapPosition } from "./last-map-position";

type JoinFailure = Extract<JoinResult, { ok: false }>["reason"];
const JOIN_ERRORS: Record<JoinFailure, string> = {
  "missing-fields": "Escribe el código de la sesión y el nombre de tu equipo.",
  "not-found": "No existe ninguna sesión con ese código.",
  closed: "Esa sesión está cerrada.",
  offline: "No se pudo conectar. Inténtalo de nuevo.",
};
type EmailNotice = { tone: "good" | "warn"; text: string };
const GONE_NOTICE: EmailNotice = { tone: "warn", text: "Tu correo no se ha guardado: la sesión ya no lo admite." };
const EMAIL_NOTICES: Record<Exclude<EmailSubmitResult, "invalid">, EmailNotice> = {
  ok: { tone: "good", text: "Correo guardado. ¡Gracias!" },
  offline: { tone: "warn", text: "Sin conexión: te has unido, pero tu correo no se ha guardado." },
  closed: GONE_NOTICE, gone: GONE_NOTICE, disabled: GONE_NOTICE, nosession: GONE_NOTICE,
};
const RETRY_NOTICE: EmailNotice = { tone: "warn", text: "Revisa el correo e inténtalo de nuevo." };
const OFFLINE_RETRY_NOTICE: EmailNotice = { tone: "warn", text: "Sin conexión: tu correo no se ha guardado. Inténtalo de nuevo." };
/** The robot waits a moment on the old island, then walks to the new one. */
const WALK_DELAY_MS = 500, WALK_END_MS = 2100;

/** Start page: join a session, pick a team and a robot, and choose a level on the map. */
export function HomeScreen() {
  const { profile, membership, progress, levelAccess, emails } = useServices();
  const [team, setTeam] = useState("");
  const [scores, setScores] = useState<ScoreBoard>({});
  const [session, setSession] = useState<JoinedSession | null>(null);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<JoinedSession | null>(null);
  const [askEmail, setAskEmail] = useState(false);
  const [emailNotice, setEmailNotice] = useState<{ tone: "good" | "warn"; text: string } | null>(null);
  const { unlocked, loading } = useUnlockedLevels();
  const play = usePlayStatus(team);
  const [heroAt, setHeroAt] = useState<number | null>(null);
  const [walking, setWalking] = useState(false);
  const [opened, setOpened] = useState(0);
  const previousUnlocked = useRef<number | null>(null);
  const [avatar, setAvatar] = useState(0);
  const [medals, setMedals] = useState<string[]>([]);
  const router = useRouter();
  const pickAvatar = (next: number) => { setAvatar(next); profile.chooseAvatar(next); };
  const reloadProgress = () => { setScores(progress.scores()); setMedals(progress.medals()); };

  useEffect(() => {
    setTeam((current) => current || profile.teamName()); setScores(progress.scores()); setSession(membership.current()); setAvatar(profile.avatar()); setMedals(progress.medals());
    const params = new URLSearchParams(window.location.search);
    if (params.has("todos")) levelAccess.setAllUnlocked(params.get("todos") === "1");
    const sharedCode = params.get("c");
    if (sharedCode) setCode((current) => current || sharedCode.toUpperCase());
  }, [profile, membership, progress, levelAccess]);

  const join = async () => {
    setError("");
    if (!hasJoinDetails(code, team)) { setError(JOIN_ERRORS["missing-fields"]); return; }
    setBusy(true);
    const result = await membership.join(code, team);
    if (result.ok && emails.needsAnswer(result.collectEmails)) setPending(result.session);
    else if (result.ok) { setSession(result.session); reloadProgress(); } else setError(JOIN_ERRORS[result.reason]);
    setBusy(false);
  };

  const enterSession = (notice: { tone: "good" | "warn"; text: string } | null) => {
    setEmailNotice(notice);
    if (pending) { setSession(pending); setPending(null); reloadProgress(); }
    setAskEmail(false);
  };

  const submitEmail = async (email: string, consent: boolean) => {
    setBusy(true);
    const outcome = await emails.submit(team, email, consent);
    setBusy(false);
    if (outcome === "invalid") { setEmailNotice(RETRY_NOTICE); return; }
    // A team that is already in the session keeps the form open to try again; one joining goes in anyway.
    if (outcome === "offline" && !pending) { setEmailNotice(OFFLINE_RETRY_NOTICE); return; }
    enterSession(EMAIL_NOTICES[outcome]);
  };

  const skipEmail = () => { emails.dismiss(); enterSession(null); };
  const emailHandlers = { busy, onSubmit: submitEmail, onSkip: skipEmail, notice: emailNotice };

  // A team already in the session is asked once when the facilitator turns the option on.
  useEffect(() => {
    if (!session) { setAskEmail(false); return; }
    let alive = true;
    const check = () => { emails.shouldAsk().then((ask) => { if (alive && ask) setAskEmail(true); }); };
    check();
    // Teams already on the page notice when the facilitator turns the option on.
    const onVisible = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVisible);
    return () => { alive = false; document.removeEventListener("visibilitychange", onVisible); };
  }, [session, emails]);

  useEffect(() => {
    if (previousUnlocked.current !== null && unlocked > previousUnlocked.current) { setOpened(unlocked); sfx.coin(); }
    previousUnlocked.current = unlocked;
  }, [unlocked]);

  const states = levelStates(scores, unlocked);
  const firstOpen = states.findIndex((state) => state === "open");
  const here = firstOpen >= 0 ? firstOpen : Math.max(0, Math.min(GAMES.length, unlocked) - 1);

  // The robot walks to the new island when the player has advanced since the last visit to the map.
  useEffect(() => {
    if (loading) return;
    const previous = swapLastMapPosition(here);
    if (previous === null || previous === here || previous >= SPOTS.length) { setHeroAt(here); return; }
    setHeroAt(previous);
    const startWalk = setTimeout(() => { setWalking(true); setHeroAt(here); }, WALK_DELAY_MS);
    const endWalk = setTimeout(() => { setWalking(false); sfx.coin(); }, WALK_END_MS);
    return () => { clearTimeout(startWalk); clearTimeout(endWalk); };
  }, [here, loading]);

  const leave = () => {
    if (!window.confirm("Si sales de la sesión se borra tu progreso en ella (puntuaciones y niveles desbloqueados). ¿Salir?")) return;
    membership.leave(); setSession(null); setEmailNotice(null); setCode(""); reloadProgress();
  };

  const canPlay = !!team.trim();

  return (
    <>
      <h1 className="glow"><i className="sp robot logo" />AGENTS QUEST</h1>
      <p className="muted">Un nivel por concepto. Jugad por equipos y sumad puntos en el ranking de vuestra sesión.</p>

      {session
        ? <JoinedSessionCard session={session} team={team} avatar={avatar} onTeamChange={(name) => { setTeam(name); profile.renameTeam(name); }} onAvatarChange={pickAvatar} onLeave={leave} askEmail={askEmail} emailNotice={emailNotice} email={emailHandlers} />
        : <JoinSessionCard code={code} team={team} avatar={avatar} error={error} busy={busy} onCodeChange={setCode} onTeamChange={setTeam} onAvatarChange={pickAvatar} onJoin={join} emailStep={pending !== null} email={emailHandlers} />}

      {opened > 0 && (
        <div className="opened" role="status">
          <strong>¡El formador ha abierto el {GAMES[opened - 1].title}!</strong>
          {canPlay && <Link className="btn start" href={GAMES[opened - 1].href}>▶ JUGAR AHORA</Link>}
          <button className="btn ghost" onClick={() => setOpened(0)}>OK</button>
        </div>
      )}
      {session && unlocked === 0 && <p className="muted blink">Esperando a que el formador abra el primer nivel...</p>}
      {!session && <p className="muted">Únete a una sesión para jugar: los niveles los abre el formador a medida que avanza la explicación.</p>}

      <WorldMap states={states} avatar={avatar} canPlay={canPlay} here={here} heroAt={heroAt ?? here} walking={walking} onEnter={(href) => { sfx.click(); router.push(href); }} />
      <LevelList states={states} scores={scores} medals={medals} canPlay={canPlay} play={play.view} />

      <p><Link href="/glosario">Glosario &gt;</Link> · <Link href="/ranking">Ver ranking &gt;</Link> · <Link href="/sesion/nueva">Soy formador &gt;</Link></p>
    </>
  );
}
