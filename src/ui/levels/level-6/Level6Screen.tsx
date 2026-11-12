"use client";
import { useEffect, useRef, useState } from "react";
import {
  CAPACITY as CAP, LANES, LANE_NAME, MAX_SCORE, ROUNDS,
  activeSubagents, evaluate, evaluationMistakes, laneLoad, tasksOf, type Assignment, type Evaluation, type Lane, type Task,
} from "@/src/domain/levels/level-6/agent-team";
import { AVATAR_COUNT } from "@/src/domain/session/score-submission";
import { shuffle } from "@/src/domain/shared/random";
import { seedOrder, teamSeed } from "@/src/domain/shared/seed";
import { robotIdleSheet, robotWalkSheet } from "@/src/ui/art/pixel-art";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useAvatar } from "@/src/ui/hooks/useAvatar";
import { useTeamName } from "@/src/ui/hooks/useTeamName";
import { useServices } from "@/src/ui/services-context";

const GAME = "nivel-6";
const FACTS = [
  <><strong>3 misiones</strong>, hasta 100 puntos cada una. Con 180 de 300 superas el nivel.</>,
  <>Cada agente tiene {CAP} huecos de contexto. El principal gasta además 1 hueco por el resumen de cada subagente que uses.</>,
  <>Los subagentes trabajan a la vez, no ven tu conversación y solo devuelven un resumen.</>,
];
const SHORT: Record<Lane, string> = { main: "PRINCIPAL", a: "SUB A", b: "SUB B" };
const CLS: Record<Lane, string> = { main: "plan", a: "ask", b: "agent" };
const WORK_MS = 1500;

export function Level6Screen() {
  const { membership } = useServices();
  const team = useTeamName();
  const avatar = useAvatar();
  const [started, setStarted] = useState(false);
  const [rounds, setRounds] = useState(ROUNDS);
  const [round, setRound] = useState(0);
  const [order, setOrder] = useState<Task[]>([]);
  const [as, setAs] = useState<Assignment>({});
  const [phase, setPhase] = useState<"prep" | "run" | "done">("prep");
  const [report, setReport] = useState<Evaluation | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const total = scores.reduce((x, y) => x + y, 0);
  const deal = (r: number, list = rounds) => { if (r < list.length) setOrder(shuffle(list[r].tasks)); setAs({}); setReport(null); setPhase("prep"); setRound(r); };
  const start = () => {
    const list = seedOrder(ROUNDS, teamSeed(team, membership.current()?.code));
    setRounds(list); setScores([]); setTags([]); deal(0, list); setStarted(true);
  };

  if (!started) {
    return (
      <LevelIntro title="NIVEL 6" subtitle="El equipo de agentes" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>Una misión grande no cabe en un solo contexto. Reparte las tareas entre el <strong style={{ color: "var(--gold)" }}>agente principal</strong> y dos <strong style={{ color: "var(--gold)" }}>subagentes</strong>, que trabajan a la vez y con su propia mesa limpia.</p>
        <ul className="legend">
          <li><span className="chip plan">PRINCIPAL</span> habla contigo y recibe los resúmenes.</li>
          <li><span className="chip ask">SUB A</span><span className="chip agent">SUB B</span> trabajan en paralelo, sin ver tu conversación.</li>
        </ul>
      </LevelIntro>
    );
  }

  if (round >= rounds.length) {
    return <LevelResult game={GAME} team={team} points={total} max={MAX_SCORE} onRetry={start} tags={tags} />;
  }

  const r = rounds[round];
  const pending = order.filter((t) => !as[t.id]);
  const nameOf = (id: string) => r.tasks.find((t) => t.id === id)!.text;
  const put = (id: string, l: Lane) => { if (phase === "prep") setAs({ ...as, [id]: l }); };
  const take = (id: string) => { if (phase !== "prep") return; const n = { ...as }; delete n[id]; setAs(n); };

  const launch = () => {
    setPhase("run");
    timer.current = setTimeout(() => {
      const ev = evaluate(r, as);
      setReport(ev); setScores((current) => [...current, ev.score]); setTags((current) => [...current, ...evaluationMistakes(ev)]);
      if (ev.issues.length === 0) sfx.ok(); else { sfx.bad(); shake(); }
      setPhase("done");
    }, WORK_MS);
  };

  return (
    <>
      <div className="hud"><ExitButton /><span>MISIÓN {round + 1}/{rounds.length}</span><span>POR REPARTIR {pending.length}</span><span className="pts">{total} PTS</span></div>
      <div className="card talk withbot"><i className="talkbot a4" style={{ backgroundImage: robotIdleSheet(avatar) }} /><div><div className="muted">MISIÓN</div><div style={{ fontSize: 28 }}>{r.mission}</div></div></div>

      <div className="lanes">
        {LANES.map((l, k) => {
          const u = laneLoad(r, as, l); const mine = tasksOf(r, as, l); const n = l === "main" ? avatar : (avatar + 2 + k) % AVATAR_COUNT;
          const subs = l === "main" ? activeSubagents(r, as) : 0;
          return (
            <div key={l} className={`lane ${CLS[l]} ${u > CAP ? "over" : ""}`}>
              <div className="lanehead">
                <i className={phase === "run" && mine.length ? "lanebot a2 busy" : "lanebot a4"} style={{ backgroundImage: phase === "run" && mine.length ? robotWalkSheet(n) : robotIdleSheet(n) }} />
                <div><strong>{LANE_NAME[l]}</strong><small>{l === "main" ? "Habla contigo" : "En paralelo, mesa limpia"}</small></div>
              </div>
              <div className="ctxmeter">{Array.from({ length: Math.max(CAP, u) }, (_, i) => <b key={i} className={i < u ? (i >= CAP ? "over" : "on") : ""} />)}<span>{u}/{CAP}</span></div>
              <div className="lanetasks">
                {mine.map((t) => <button key={t.id} className="ltask" onClick={() => take(t.id)} title="Pulsa para devolverla">{t.text} <em>{"■".repeat(t.load)}</em></button>)}
                {subs > 0 && <div className="ltask sum">Resumen de {subs} subagente{subs > 1 ? "s" : ""} <em>{"■".repeat(subs)}</em></div>}
                {!mine.length && !subs && <div className="laneempty">— sin tareas —</div>}
              </div>
            </div>
          );
        })}
      </div>

      {phase === "prep" && (
        <>
          {pending.length > 0 && <div className="muted" style={{ margin: "14px 4px 6px" }}>TAREAS POR REPARTIR (elige quién hace cada una)</div>}
          <div className="taskpool">
            {pending.map((t) => (
              <div key={t.id} className="taskcard">
                <div className="tasktext">{t.text}</div>
                <div className="taskmeta">
                  <span>Contexto <em>{"■".repeat(t.load)}</em></span>
                  {t.area && <span>Edita <code>{t.area}</code></span>}
                  {t.after && <span className="dep">Necesita: «{nameOf(t.after)}»</span>}
                  {t.you && <span className="you">Hay que hablarlo contigo</span>}
                </div>
                <div className="taskbtns">{LANES.map((l) => <button key={l} className={`btn ${CLS[l]}`} onClick={() => put(t.id, l)}>{SHORT[l]}</button>)}</div>
              </div>
            ))}
          </div>
          <p>{pending.length === 0
            ? <button className="btn agent start" onClick={launch}>LANZAR AGENTES</button>
            : <span className="muted">Reparte todas las tareas para lanzar a los agentes. Pulsa una ya repartida para devolverla.</span>}</p>
        </>
      )}

      {phase === "run" && <p className="muted" style={{ margin: 8 }}>&gt; Los agentes están trabajando...</p>}

      {phase === "done" && report && (
        <div className="card">
          <h2>+{report.score} PTS</h2>
          {report.issues.length === 0 && <p className="fb good">Reparto limpio: cada agente con lo que le cabe, nadie pisa a nadie y las decisiones pasan por ti.</p>}
          {report.issues.map((i, k) => <p key={k} className="fb bad">−{i.cost} · {i.text}</p>)}
          <button className="btn" onClick={() => deal(round + 1)}>{round + 1 >= rounds.length ? "VER RESULTADO" : "SIGUIENTE MISIÓN"}</button>
        </div>
      )}
    </>
  );
}
