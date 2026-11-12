"use client";
import type * as React from "react";
import { useState } from "react";
import {
  GOOD_ROUND_RATIO, MAX_SCORE, ROUNDS, SLOTS,
  isPromptComplete, optionTone, promptQuality, roundScore as scoreRound, roundWeaknesses, type Picks, type SlotKey,
} from "@/src/domain/levels/level-2/prompt-rounds";
import { shuffle } from "@/src/domain/shared/random";
import { seedOrder, teamSeed } from "@/src/domain/shared/seed";
import { CLIENT, P, robotIdleSheet, robotWalkSheet, spriteUrl, workbench } from "@/src/ui/art/pixel-art";
import { ARTS, PixelArt } from "@/src/ui/art/sprites";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { useAvatar } from "@/src/ui/hooks/useAvatar";
import { useTeamName } from "@/src/ui/hooks/useTeamName";
import { useServices } from "@/src/ui/services-context";

const FACTS = [
  <><strong>3 rondas</strong>, hasta 100 puntos cada una. Con 180 de 300 superas el nivel.</>,
  <>El objetivo pesa el doble que las referencias o el workflow.</>,
  <>Un prompt claro da una imagen limpia; uno vago, basura de píxeles.</>,
];

const GAME = "nivel-2";
const SHOP = { "--s-client": spriteUrl(CLIENT, P), "--s-bench": spriteUrl(workbench(false), P), "--s-bench-on": spriteUrl(workbench(true), P) } as React.CSSProperties;
const shuffledOptions = () => shuffle([0, 1, 2]);

export function Level2Screen() {
  const { membership } = useServices();
  const team = useTeamName();
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState<Record<SlotKey, number[]>>({ goal: [], references: [], workflow: [] });
  const [picks, setPicks] = useState<Picks>({});
  const [sent, setSent] = useState(false);
  const [total, setTotal] = useState(0);
  const [rounds, setRounds] = useState(ROUNDS);
  const [tags, setTags] = useState<string[]>([]);
  const avatar = useAvatar();

  const deal = (r: number) => {
    setOrder({ goal: shuffledOptions(), references: shuffledOptions(), workflow: shuffledOptions() });
    setPicks({}); setSent(false); setRound(r);
  };
  const start = () => { setTotal(0); setTags([]); setRounds(seedOrder(ROUNDS, teamSeed(team, membership.current()?.code))); deal(0); setStarted(true); };

  if (!started) {
    return (
      <LevelIntro title="NIVEL 2" subtitle="Programa al robot" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>El cliente te pide un cambio y tú tienes que <strong style={{ color: "var(--gold)" }}>programar al robot con un prompt</strong>. Elige una opción para cada parte:</p>
        <ul className="legend">
          <li><span className="chip ask">OBJETIVO</span> qué tiene que conseguir. <em>Es lo que más pesa.</em></li>
          <li><span className="chip plan">REFERENCIAS</span> con qué información parte.</li>
          <li><span className="chip agent">WORKFLOW</span> cómo debe trabajar y dónde te avisa.</li>
        </ul>
      </LevelIntro>
    );
  }

  if (round >= rounds.length) {
    return <LevelResult game={GAME} team={team} points={total} max={MAX_SCORE} onRetry={start} tags={tags} />;
  }

  const r = rounds[round];
  const ready = isPromptComplete(picks);
  const q = promptQuality(r, picks);
  const roundScore = scoreRound(r, picks);
  const art = ARTS[r.art];

  const submit = () => {
    setSent(true); setTotal((t) => t + roundScore);
    setTags((current) => [...current, ...roundWeaknesses(r, picks)]);
    if (q >= GOOD_ROUND_RATIO) sfx.ok(); else sfx.bad();
  };

  return (
    <>
      <div className="hud"><ExitButton /><span>RONDA {round + 1}/{rounds.length}</span><span className="pts">{total} PTS</span></div>
      <div className="stage"><div className={`scene strip shop ${sent ? (q >= GOOD_ROUND_RATIO ? "good" : "poor") : ""}`} style={{ ...SHOP, "--bot-idle": robotIdleSheet(avatar), "--bot-walk": robotWalkSheet(avatar) } as React.CSSProperties}>
        <div className="backwall" /><div className="ground" />
        <i className="npc client" /><div className="say">!</div>
        <i className={`npc worker ${sent ? "busy" : ""}`} />
        <div className={`bench ${ready || sent ? "on" : ""}`} />
        <div className="promptleds">{SLOTS.map((sl) => <b key={sl.key} className={picks[sl.key] !== undefined ? "on" : ""}>{sl.label.slice(0, 3)}</b>)}</div>
        {sent && <><span className="puff" style={{ left: "76%" }} /><span className="puff p2" style={{ left: "80%" }} /></>}
      </div></div>
      <div className="card talk"><div className="muted">PEDIDO DEL CLIENTE</div><div style={{ fontSize: 28 }}>{r.task}</div></div>

      {!sent ? (
        <>
          {SLOTS.map((s) => (
            <div key={s.key} className="slotgroup">
              <div className="slothead"><span className="chip ask">{s.label}</span><span className="muted">{s.hint}</span></div>
              <div className="opts">
                {order[s.key].map((idx) => (
                  <button key={idx} className={`opt ${picks[s.key] === idx ? "on" : ""}`} onClick={() => setPicks({ ...picks, [s.key]: idx })}>
                    {r.slots[s.key][idx].text}
                  </button>
                ))}
              </div>
            </div>
          ))}
          <p><button className="btn agent start" disabled={!ready} onClick={submit}>ENVIAR AL ROBOT</button></p>
        </>
      ) : (
        <>
          <div className="duo">
            <div><div className="muted">LO QUE ESPERABA EL CLIENTE</div><PixelArt art={art.art} pal={art.pal} className="pxbig" /></div>
            <div><div className="muted">LO QUE CONSTRUYÓ EL ROBOT</div><PixelArt art={art.art} pal={art.pal} noise={Math.pow(1 - q, 0.8) * 0.9} seed={round * 13 + 5} className="pxbig" /></div>
          </div>
          <div className="card">
            <h2>+{roundScore} PTS</h2>
            {SLOTS.map((s) => {
              const option = r.slots[s.key][picks[s.key]!];
              return <p key={s.key} className={`fb ${optionTone(r, picks, s.key)}`}><strong>{s.label}:</strong> {option.effect}</p>;
            })}
            <button className="btn" onClick={() => deal(round + 1)}>{round + 1 >= rounds.length ? "VER RESULTADO" : "SIGUIENTE RONDA"}</button>
          </div>
        </>
      )}
    </>
  );
}
