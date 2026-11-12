"use client";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { SubmitResult } from "@/src/application/client/score-submitter";
import { GAMES } from "@/src/domain/games/catalog";
import { LESSONS } from "@/src/domain/games/lessons";
import { earnedMedals } from "@/src/domain/games/medal-rules";
import { MEDALS } from "@/src/domain/games/medals";
import { passScore } from "@/src/domain/games/progress";
import { sanitizeTeamName } from "@/src/domain/session/score-submission";
import { ICON, Sprite } from "@/src/ui/art/sprites";
import { sfx } from "@/src/ui/audio/sound";
import { useCountUp } from "@/src/ui/hooks/useCountUp";
import { useLockScroll } from "@/src/ui/hooks/useLockScroll";
import { useUnlockedLevels } from "@/src/ui/hooks/useUnlockedLevels";
import { useServices } from "@/src/ui/services-context";
import { Confetti } from "./Confetti";
import { SessionRankingSummary, type RankingRow, type RankingSummary } from "./SessionRankingSummary";

type Props = { game: string; team: string; points: number; max: number; onRetry: () => void; tags?: string[]; medals?: string[]; children?: ReactNode };
/** Outcomes after which there is no session ranking to show. */
const WITHOUT_RANKING: SubmitResult[] = ["nosession", "gone", "fail", "queued"];

/** End-of-level dialog: score, medals, lesson, and the submission to the session ranking. */
export function LevelResult({ game, team, points, max, onRetry, tags = [], medals = [], children }: Props) {
  useLockScroll();
  const { membership, progress, scores, leaderboard } = useServices();
  const [sent, setSent] = useState<"sending" | SubmitResult>("sending");
  const [summary, setSummary] = useState<RankingSummary>(null);
  const [sessionName, setSessionName] = useState("");
  const [won, setWon] = useState<{ id: string; fresh: boolean }[]>([]);
  const shown = useCountUp(points);
  const { unlocked } = useUnlockedLevels(3000);
  const counted = useRef(false);

  const index = GAMES.findIndex((candidate) => candidate.id === game);
  const current = GAMES[index];
  const nextGame = GAMES[index + 1];
  const needed = current ? passScore(current) : 0;
  const passed = points >= needed;

  useEffect(() => setSessionName(membership.current()?.name ?? ""), [membership]);
  useEffect(() => {
    progress.saveScore(game, points);
    if (counted.current) return;
    counted.current = true;
    const attempt = progress.countPlay(game);
    const ids = earnedMedals({ levelMedals: medals, points, maxPoints: max, passed, attempt });
    const fresh = progress.awardMedals(game, ids);
    setWon(ids.map((id) => ({ id, fresh: fresh.includes(id) })));
    if (passed) sfx.win(); else sfx.lose();
  }, [game, points, max, passed, medals, progress]);

  // The score is always sent to the session ranking as soon as the level ends; then the ranking is loaded.
  useEffect(() => {
    let alive = true;
    (async () => {
      const result = await scores.submit(team, game, points, tags);
      if (!alive) return;
      setSent(result);
      const session = membership.current();
      if (!session || WITHOUT_RANKING.includes(result)) return;
      try {
        const reply = await leaderboard.ranking(session.code);
        if (!reply.ok || !reply.body) return;
        const rows = (reply.body.teams as RankingRow[]).sort((a, b) => b.total - a.total);
        const me = sanitizeTeamName(team);
        if (alive) setSummary({ rows, rank: rows.findIndex((row) => row.team === me) + 1 });
      } catch { /* no ranking */ }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [team, game, points]);

  return (
    <div className="overlay">
      {passed && <Confetti />}
      <div className="card modal result" role="dialog" aria-modal="true">
        <h2>NIVEL COMPLETADO</h2>
        <div className="big">{shown} <span>/ {max}</span></div>
        {current && (
          <p className={`fb ${passed ? "good" : "bad"}`}>
            {passed
              ? <>NIVEL SUPERADO. {nextGame ? (index + 1 < unlocked ? <>El <strong>{nextGame.title}</strong> ya está abierto.</> : "Espera: el formador abrirá el siguiente nivel cuando toque.") : "¡Has completado todos los niveles!"}</>
              : <>Necesitas al menos <strong>{needed} puntos</strong> para superar el nivel. ¡Inténtalo otra vez!</>}
          </p>
        )}
        {won.length > 0 && (
          <div className="medals">
            {won.map((medal, position) => (
              <span key={medal.id} className={`medal ${medal.fresh ? "fresh" : ""}`} style={{ animationDelay: `${0.5 + position * 0.25}s` }} title={MEDALS[medal.id]?.desc}>
                <Sprite art={ICON.star} className="ico" />{MEDALS[medal.id]?.label ?? medal.id}{medal.fresh && <em>NUEVA</em>}
              </span>
            ))}
          </div>
        )}
        {children}
        {LESSONS[game] && (
          <div className="lesson">
            <div className="guidehead"><span>LO QUE TE LLEVAS</span></div>
            <p className="idea">{LESSONS[game].idea}</p>
            <p><strong>Con un agente de verdad:</strong> {LESSONS[game].real}</p>
            <p className="muted">Para comentar: {LESSONS[game].ask}</p>
            {passed && <p className="muted">Fichas nuevas en el <Link href="/glosario">glosario</Link>.</p>}
          </div>
        )}

        {sent === "sending" && sessionName && <p className="muted">Enviando tu puntuación a «{sessionName}»...</p>}
        {sent === "nosession" && <p className="fb warn">No estás en ninguna sesión, así que no entras en el ranking. <Link href="/">Únete con el código de tu formador</Link>.</p>}
        {sent === "closed" && <p className="fb warn">La sesión está cerrada: tu puntuación no se ha enviado. Queda guardada en este navegador.</p>}
        {sent === "gone" && <p className="fb warn">Esta sesión ya no existe (el formador la eliminó o caducó). Tu resultado queda guardado en este navegador.</p>}
        {sent === "queued" && <p className="fb warn">Sin conexión: tu puntuación está guardada y se enviará sola cuando vuelva internet.</p>}
        {sent === "fail" && <p className="muted">No se pudo enviar. Tu puntuación está guardada en este navegador; díselo a un formador.</p>}
        <SessionRankingSummary summary={summary} team={sanitizeTeamName(team)} />
        {summary && <p><Link className="btn ghost" href="/ranking">VER TODO EL RANKING</Link></p>}

        <div className="row">
          {nextGame && index + 1 < unlocked && <Link className="btn start" href={nextGame.href}>SIGUIENTE NIVEL</Link>}
          <button className="btn ghost" onClick={onRetry}>REINTENTAR</button>
          <Link className="btn ghost" href="/">MENU</Link>
        </div>
      </div>
    </div>
  );
}
