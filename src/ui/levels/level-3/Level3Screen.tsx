"use client";
import type * as React from "react";
import { useState } from "react";
import {
  CAPACITY, CLEAR_COST, GOOD_ROUND_SCORE, ITEMS, MAX_SCORE, NOISE_COST, ROUNDS,
  evaluateDesk, evaluationMistakes, isOnDesk, loadItem, removeItem, runMedals, totalScore, usedSlots, type Desk, type Evaluation,
} from "@/src/domain/levels/level-3/context-desk";
import { shuffle } from "@/src/domain/shared/random";
import { seedOrder, teamSeed } from "@/src/domain/shared/seed";
import { ITEM_ART, ITEM_PAL, robotIdleSheet, spriteUrl } from "@/src/ui/art/pixel-art";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useAvatar } from "@/src/ui/hooks/useAvatar";
import { useTeamName } from "@/src/ui/hooks/useTeamName";
import { useServices } from "@/src/ui/services-context";

const FACTS = [
  <><strong>3 tareas seguidas con la misma mesa</strong>, hasta 100 puntos cada una. Con 180 de 300 superas el nivel.</>,
  <>Cada hueco de ruido resta {NOISE_COST} puntos; <kbd>/clear</kbd> vacía la mesa y cuesta {CLEAR_COST}.</>,
  <>Pulsa un elemento de la mesa para sacarlo.</>,
];

const GAME = "nivel-3";
const TAG = { file: "FICHERO", log: "LOG", chat: "CHAT", doc: "DOC" } as const;
const ICONS = Object.fromEntries(Object.entries(ITEM_ART).map(([k, a]) => [k, spriteUrl(a, ITEM_PAL)])) as Record<string, string>;
const Pips = ({ n }: { n: number }) => <span className="pips3">{[0, 1, 2].map((i) => <b key={i} className={i < n ? "on" : ""} />)}</span>;

export function Level3Screen() {
  const { membership } = useServices();
  const team = useTeamName();
  const [started, setStarted] = useState(false);
  const [round, setRound] = useState(0);
  const [pool, setPool] = useState<string[]>([]);
  const [bag, setBag] = useState<Desk>([]);
  const [log, setLog] = useState<{ text: string; tone: string }[]>([]);
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [clears, setClears] = useState(0);
  const [evictions, setEvictions] = useState(0);
  const [rounds, setRounds] = useState(ROUNDS);
  const [tags, setTags] = useState<string[]>([]);
  const avatar = useAvatar();

  const say = (text: string, tone = "info") => setLog((l) => [...l.slice(-3), { text, tone }]);
  const deal = (r: number) => { if (r < rounds.length) setPool(shuffle(rounds[r].pool)); setEv(null); setRound(r); };
  const start = () => { setRounds(seedOrder(ROUNDS, teamSeed(team, membership.current()?.code))); setTags([]); setBag([]); setScores([]); setClears(0); setEvictions(0); setLog([{ text: "Tu mesa de trabajo tiene 8 huecos. Elige bien.", tone: "info" }]); deal(0); setStarted(true); };

  const total = totalScore(scores, clears);

  if (!started) {
    return (
      <LevelIntro title="NIVEL 3" subtitle="La mochila" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>El contexto del agente es una <strong style={{ color: "var(--gold)" }}>mesa de trabajo pequeña</strong>: solo caben {CAPACITY} huecos.</p>
        <ul className="legend">
          <li>Cada fichero, log o chat ocupa <strong>1 a 3 huecos</strong>.</li>
          <li>Si te pasas, el agente <strong style={{ color: "var(--bad)" }}>olvida lo más antiguo</strong>.</li>
          <li>Lo que sobra no da error: <strong style={{ color: "var(--warn)" }}>degrada en silencio</strong> la calidad.</li>
          <li><kbd>/clear</kbd> vacía la mesa, pero cuesta {CLEAR_COST} puntos.</li>
        </ul>
      </LevelIntro>
    );
  }

  if (round >= rounds.length) {
    return <LevelResult game={GAME} team={team} points={total} max={MAX_SCORE} onRetry={start} tags={[...tags, ...(clears > 0 ? ["Usó /clear"] : [])]} medals={runMedals(total, clears)}>
      <p>{clears} /clear · {evictions} olvido(s) automático(s).</p>
    </LevelResult>;
  }

  const r = rounds[round];
  const used = usedSlots(bag);

  const add = (id: string) => {
    if (ev) return;
    const item = ITEMS[id];
    if (isOnDesk(bag, id)) return;
    const { desk, evicted } = loadItem(bag, item);
    setBag(desk);
    if (evicted.length) { setEvictions((n) => n + evicted.length); sfx.bad(); say(`La mesa se llena: el agente olvida ${evicted.map((e) => e.name).join(", ")}.`, "bad"); }
    else say(`+ ${item.name} (${item.size} hueco${item.size > 1 ? "s" : ""})`, "info");
  };
  const drop = (id: string) => { if (ev) return; setBag(removeItem(bag, id)); };
  const clear = () => { if (ev || !bag.length) return; setBag([]); setClears((n) => n + 1); sfx.bad(); say(`/clear: mesa vacía (-${CLEAR_COST} pts). Tendrás que volver a cargar lo necesario.`, "warn"); };

  const run = () => {
    const evaluation = evaluateDesk(r, bag);
    setEv(evaluation);
    setTags((current) => [...current, ...evaluationMistakes(evaluation)]);
    if (evaluation.score >= GOOD_ROUND_SCORE) sfx.ok(); else { sfx.bad(); shake(); }
    setScores((current) => [...current, evaluation.score]);
  };

  const next = () => deal(round + 1);

  return (
    <>
      <div className="hud"><ExitButton /><span>RONDA {round + 1}/{rounds.length}</span><span>MESA {used}/{CAPACITY}</span><span className="pts">{total} PTS</span></div>
      <div className="card talk withbot"><i className="talkbot a4" style={{ backgroundImage: robotIdleSheet(avatar) }} /><div><div className="muted">TAREA DEL AGENTE</div><div style={{ fontSize: 28 }}>{r.task}</div></div></div>

      <div className="muted" style={{ margin: "0 4px 6px" }}>MESA DE TRABAJO (contexto del agente)</div>
      <div className={`desk ${used >= CAPACITY ? "full" : ""}`}><div className="bag">
        {bag.map((b) => {
          const state = ev ? (r.needed.includes(b.id) ? "useful" : "noise") : "";
          return <button key={b.id} className={`bagitem k-${b.kind} ${state}`} style={{ gridColumn: `span ${b.size}` }} onClick={() => drop(b.id)} title="Clic para sacar"><i className="sp" style={{ backgroundImage: ICONS[b.kind] }} /><span>{b.name}</span></button>;
        })}
        {Array.from({ length: Math.max(0, CAPACITY - used) }, (_, i) => <div key={`e${i}`} className="bagempty" />)}
      </div><div className="deskmeter">{Array.from({ length: CAPACITY }, (_, i) => <b key={i} className={i < used ? "on" : ""} />)}<span>{used}/{CAPACITY} huecos</span></div></div>

      {!ev && (
        <>
          <div className="muted" style={{ margin: "18px 4px 6px" }}>ESTANTERÍA (clic para cargar en la mesa)</div>
          <div className="shelf">
            {pool.map((id) => {
              const it = ITEMS[id]; const inBag = isOnDesk(bag, id);
              return (
                <button key={id} className={`shelfitem k-${it.kind}`} disabled={inBag} onClick={() => add(id)}>
                  <i className="sp" style={{ backgroundImage: ICONS[it.kind] }} />
                  <span><small>{TAG[it.kind]} <Pips n={it.size} /></small>{it.name}</span>
                </button>
              );
            })}
          </div>
          <div className="actions">
            <button className="btn agent" onClick={run}>EJECUTAR TAREA</button>
            <button className="btn ghost" onClick={clear} disabled={!bag.length}>/CLEAR (-{CLEAR_COST})</button>
          </div>
        </>
      )}

      <div className="terminal" style={{ minHeight: 90 }}>
        {log.map((l, i) => <div key={i} className={l.tone}>&gt; {l.text}</div>)}
        <div className="cursor">&gt; _</div>
      </div>

      {ev && (
        <div className="card">
          <h2>+{ev.score} PTS</h2>
          <p className={ev.missing.length ? "fb bad" : "fb good"}>
            {ev.missing.length ? `Al agente le falta: ${ev.missing.map((m) => ITEMS[m].name).join(", ")}. Trabaja a ciegas en esa parte.` : "Tenía todo lo necesario."}
          </p>
          <p className={ev.noise.length ? "fb warn" : "fb good"}>
            {ev.noise.length ? `Ruido en la mesa: ${ev.noise.map((n) => n.name).join(", ")} (${usedSlots(ev.noise)} huecos, -${NOISE_COST} pts cada uno). No da error, solo degrada.` : "Mesa limpia: todo lo que hay es útil."}
          </p>
          <button className="btn" onClick={next}>{round + 1 >= rounds.length ? "VER RESULTADO" : "SIGUIENTE TAREA"}</button>
        </div>
      )}
    </>
  );
}
