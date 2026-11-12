"use client";
import type * as React from "react";
import { useEffect, useRef, useState } from "react";
import {
  LIVES, MISSIONS, POINTS,
  isMissionOver, livesLeft, maxScore, missMistake, missionFor, rightOption, scoreFor, type Stage,
} from "@/src/domain/levels/level-7/final-mission";
import { shuffle } from "@/src/domain/shared/random";
import { hash, teamSeed } from "@/src/domain/shared/seed";
import { bossSheet, robotIdleSheet } from "@/src/ui/art/pixel-art";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useAvatar } from "@/src/ui/hooks/useAvatar";
import { useTeamName } from "@/src/ui/hooks/useTeamName";
import { useServices } from "@/src/ui/services-context";

const GAME = "nivel-7";
const FACTS = [
  <><strong>6 decisiones</strong>, una por cada concepto del taller. {POINTS} puntos por acierto; con 180 de 300 superas el nivel.</>,
  <>Cada acierto golpea al jefe. Cada fallo te cuesta una vida: con {LIVES} fallos, la misión se acaba.</>,
];
const FX_MS = 700;
const BOSS = { "--s-boss": bossSheet() } as React.CSSProperties;
const STARS = Array.from({ length: 22 }, (_, i) => ({ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 60}%`, animationDelay: `${(i % 7) * 0.4}s` }));

export function Level7Screen() {
  const { membership } = useServices();
  const team = useTeamName();
  const avatar = useAvatar();
  const [started, setStarted] = useState(false);
  const [mission, setMission] = useState(MISSIONS[0]);
  const [n, setN] = useState(0);
  const [order, setOrder] = useState<number[]>([]);
  const [pick, setPick] = useState<number | null>(null);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState<string[]>([]);
  const [fx, setFx] = useState<"" | "hit" | "ouch">("");
  const [over, setOver] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const deal = (i: number) => { setOrder(shuffle([0, 1, 2])); setPick(null); setN(i); };
  const start = () => {
    setMission(missionFor(hash(teamSeed(team, membership.current()?.code))));
    setHits(0); setMisses([]); setOver(false); setFx(""); deal(0); setStarted(true);
  };

  if (!started) {
    return (
      <LevelIntro title="JEFE FINAL" subtitle="La misión completa" team={team} onStart={start} facts={FACTS}>
        <p>El <strong style={{ color: "var(--bad)" }}>Legacy</strong> guarda la salida. Para vencerlo tienes que llevar una misión de principio a fin tomando <strong style={{ color: "var(--gold)" }}>una decisión por cada concepto</strong> que has practicado.</p>
        <ul className="legend">
          <li><span className="chip ask">1</span> en qué modo empiezas</li>
          <li><span className="chip ask">2</span> qué herramienta usas</li>
          <li><span className="chip ask">3</span> qué le pides</li>
          <li><span className="chip ask">4</span> qué contexto le das</li>
          <li><span className="chip ask">5</span> qué regla lo frena</li>
          <li><span className="chip ask">6</span> qué delegas</li>
        </ul>
      </LevelIntro>
    );
  }

  const stages = mission.stages;
  const lives = livesLeft(misses.length);
  if (over) {
    return (
      <LevelResult game={GAME} team={team} points={scoreFor(hits)} max={maxScore(mission)} onRetry={start} tags={misses.map(missMistake)}>
        <p>{hits === stages.length ? "¡Legacy derrotado sin un solo fallo!" : lives <= 0 ? `El Legacy resiste: ${hits} golpes de ${stages.length}.` : `Legacy derrotado con ${hits} de ${stages.length} decisiones acertadas.`}</p>
      </LevelResult>
    );
  }

  const st: Stage = stages[n];
  const chosen = pick !== null ? st.options[pick] : null;
  const good = rightOption(st);
  const choose = (i: number) => {
    if (pick !== null) return;
    setPick(i);
    if (st.options[i].ok) { setHits((h) => h + 1); setFx("hit"); sfx.ok(); }
    else { setMisses((m) => [...m, st.kind]); setFx("ouch"); sfx.hit(); shake(); }
    timer.current = setTimeout(() => setFx(""), FX_MS);
  };
  const isLast = isMissionOver(mission, n, misses.length);
  const next = () => { if (isLast) setOver(true); else deal(n + 1); };
  const hp = stages.length - hits;

  return (
    <>
      <div className="hud"><ExitButton />
        <span className="hearts">{Array.from({ length: LIVES }, (_, i) => <i key={i} className={`sp heart ${i < lives ? "" : "off"}`} />)}</span>
        <span>FASE {n + 1}/{stages.length}</span><span className="pts">{scoreFor(hits)} PTS</span>
      </div>

      <div className="stage"><div className={`scene strip bossroom ${fx}`} style={{ ...BOSS, "--bot-idle": robotIdleSheet(avatar) } as React.CSSProperties}>
        {STARS.map((s, i) => <i key={i} className="star" style={s} />)}
        <div className="ground" />
        <i className="npc worker" />
        <i className="bolt" />
        <i className="bossbug a2" />
        <div className="bosshp"><span>LEGACY</span><div>{Array.from({ length: stages.length }, (_, i) => <b key={i} className={i < hp ? "on" : ""} />)}</div></div>
      </div></div>

      <div className="card talk"><div className="muted">MISIÓN</div><div style={{ fontSize: 24 }}>{mission.title}</div></div>

      <div className="slotgroup">
        <div className="slothead"><span className="chip ask">{st.kind}</span><span className="muted">Repaso del nivel {st.level}</span></div>
        <p style={{ fontSize: 26, margin: "4px 4px 12px" }}>{st.ask}</p>
        <div className="opts">
          {order.map((i) => {
            const o = st.options[i];
            const cls = pick === null ? "" : o.ok ? "right" : pick === i ? "wrong" : "dim";
            return <button key={i} className={`opt ${cls}`} disabled={pick !== null} onClick={() => choose(i)}>{o.text}</button>;
          })}
        </div>
      </div>

      {chosen && (
        <div className="card">
          <h2 style={{ color: chosen.ok ? "var(--ok)" : "var(--bad)" }}>{chosen.ok ? `¡GOLPE AL LEGACY! +${POINTS}` : "EL LEGACY CONTRAATACA"}</h2>
          <p className={`fb ${chosen.ok ? "good" : "bad"}`}>{chosen.why}</p>
          {!chosen.ok && <p className="fb good">Mejor: {good.text} {good.why}</p>}
          <button className="btn" onClick={next}>{isLast ? "VER RESULTADO" : "SIGUIENTE FASE"}</button>
        </div>
      )}
    </>
  );
}
