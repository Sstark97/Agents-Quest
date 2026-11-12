"use client";
import Link from "next/link";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  COST, IMPROVISE_STEPS, MAX_PLAN, MAX_SCORE, READ_RADIUS, VARIANTS,
  createMaze, inBounds, isWall, key, manhattan, runMedals, runMistakes, scoreRun, shortestPath, type Maze, type Pos,
} from "@/src/domain/levels/level-1/maze";
import { hash, teamSeed } from "@/src/domain/shared/seed";
import { robotIdleSheet, robotWalkSheet } from "@/src/ui/art/pixel-art";
import { ICON, Sprite } from "@/src/ui/art/sprites";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useServices } from "@/src/ui/services-context";

const FACTS = [
  <>Sales con <strong>{MAX_SCORE} puntos</strong>: −{COST.damage} por fichero roto, −{COST.read} por lectura y −{COST.extraStep} por paso de más. Con 180 superas el nivel.</>,
  <>Cada lectura descubre las casillas a {READ_RADIUS} pasos del robot. El plan admite {MAX_PLAN} pasos: ejecuta y sigue planificando.</>,
  <>Teclado: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> o <kbd>Tab</kbd> cambian de modo · <kbd>R</kbd> lee · <kbd>flechas</kbd> trazan · <kbd>Retroceso</kbd> borra · <kbd>Enter</kbd> ejecuta.</>,
];

const GAME = "nivel-1";
const LIVES = 3;
type Mode = "ask" | "plan" | "agent";
type LogLine = { text: string; tone: "info" | "good" | "bad" | "warn" };

const MODES: Record<Mode, { icon: string[]; name: string; perm: string; hint: string }> = {
  ask: { icon: ICON.lock, name: "ASK", perm: "Solo consulta", hint: "Lee el repo y te lo explica. No puede planificar ni editar." },
  plan: { icon: ICON.clip, name: "PLAN", perm: "Edición bloqueada", hint: "Diseña la ruta y la deja lista. No puede ejecutarla." },
  agent: { icon: ICON.bolt, name: "AGENT", perm: "Permiso completo", hint: "Ejecuta el plan sobre el repo real. Sin plan, improvisa." },
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const same = (a: Pos, b: Pos) => a.r === b.r && a.c === b.c;
const h2 = (r: number, c: number) => ((r * 73856093) ^ (c * 19349663)) >>> 0;
const wallAt = (maze: Maze, r: number, c: number) => !inBounds(maze, { r, c }) || isWall(maze, { r, c });
/** Picks the tile of every wall cell: "top" when there is more wall below, or a decorated front face. */
function wallClass(maze: Maze, r: number, c: number) {
  if (r + 1 >= maze.rows || isWall(maze, { r: r + 1, c })) {
    const e = [!wallAt(maze, r - 1, c) && "en", !wallAt(maze, r, c - 1) && "ew", !wallAt(maze, r, c + 1) && "ee"].filter(Boolean).join(" ");
    return `top ${e}`;
  }
  const v = h2(r, c) % 10;
  return v < 3 ? "face rack a2" : v < 5 ? "face term a2" : v < 7 ? "face pipe" : "face panel";
}
const dirOf = (from: Pos, to: Pos) => (to.r < from.r ? "n" : to.r > from.r ? "s" : to.c < from.c ? "w" : "e");

export function Level1Screen() {
  const { profile, membership } = useServices();
  const [maze, setMaze] = useState<Maze>(() => createMaze(0));
  const [team, setTeam] = useState("");
  const [started, setStarted] = useState(false);
  const [mode, setMode] = useState<Mode>("ask");
  const [pos, setPos] = useState<Pos>(maze.start);
  const [scanned, setScanned] = useState<Set<string>>(new Set([key(maze.start)]));
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [broken, setBroken] = useState<Set<string>>(new Set());
  const [plan, setPlan] = useState<Pos[]>([]);
  const [running, setRunning] = useState(false);
  const [reads, setReads] = useState(0);
  const [steps, setSteps] = useState(0);
  const [damage, setDamage] = useState(0);
  const [done, setDone] = useState(false);
  const [log, setLog] = useState<LogLine[]>([]);
  const alive = useRef(true);
  const improvised = useRef(false);
  const [avatar, setAvatar] = useState(0);
  const [face, setFace] = useState<"l" | "r">("r");
  const [pings, setPings] = useState<Map<string, number>>(new Map());
  const [scanId, setScanId] = useState(0);
  const [showResult, setShowResult] = useState(false);

  useEffect(() => { setTeam(profile.teamName()); setAvatar(profile.avatar()); alive.current = true; return () => { alive.current = false; }; }, [profile]);

  const say = useCallback((text: string, tone: LogLine["tone"] = "info") => setLog((l) => [...l.slice(-4), { text, tone }]), []);
  const final = scoreRun(maze, damage, reads, steps);
  const tags = runMistakes(maze, { broken, improvised: improvised.current, steps, reads });

  const reset = (target: Maze = maze) => {
    setMode("ask"); setPos(target.start); setScanned(new Set([key(target.start)])); setRevealed(new Set()); setBroken(new Set());
    setPlan([]); setRunning(false); setReads(0); setSteps(0); setDamage(0); setDone(false); setShowResult(false); setPings(new Map()); setFace(target.start.c > target.cols / 2 ? "l" : "r"); improvised.current = false;
    setLog([{ text: "Nueva misión: llega al cohete sin romper ningún fichero crítico.", tone: "info" }]);
  };
  const start = () => {
    const next = createMaze(hash(teamSeed(team, membership.current()?.code)) % VARIANTS);
    setMaze(next); reset(next); setStarted(true);
  };

  const pickMode = useCallback((m: Mode) => {
    if (running || done) return;
    setMode(m);
    say(`Modo ${MODES[m].name} · ${MODES[m].perm}`, "info");
  }, [running, done, say]);

  const read = useCallback(() => {
    if (running || done) return;
    if (mode !== "ask") { say("Solo en modo ASK puedes investigar el repo a fondo.", "warn"); return; }
    const newScanned = new Set(scanned);
    const newRevealed = new Set(revealed);
    let found = 0;
    const fresh = new Map<string, number>();
    for (let r = 0; r < maze.rows; r++) for (let c = 0; c < maze.cols; c++) {
      const p = { r, c };
      if (isWall(maze, p) || manhattan(p, pos) > READ_RADIUS) continue;
      if (!newScanned.has(key(p))) fresh.set(key(p), manhattan(p, pos));
      newScanned.add(key(p));
      if (maze.hazards.has(key(p)) && !newRevealed.has(key(p))) { newRevealed.add(key(p)); found++; }
    }
    setScanned(newScanned); setRevealed(newRevealed); setReads((n) => n + 1); setPings(fresh); setScanId((n) => n + 1); sfx.click();
    say(found ? `Lectura (-${COST.read}): ${found} fichero(s) crítico(s) detectado(s). ¡No los pises!` : `Lectura (-${COST.read}): zona despejada.`, found ? "warn" : "good");
  }, [running, done, mode, scanned, revealed, pos, say, maze]);

  const clickCell = (p: Pos) => {
    if (running || done) return;
    if (mode !== "plan") { say(mode === "ask" ? "En ASK no puedes planificar. Cambia a PLAN." : "AGENT ejecuta planes; para trazarlos usa PLAN.", "warn"); return; }
    if (isWall(maze, p)) return;
    const idx = plan.findIndex((q) => same(q, p));
    if (idx >= 0) { setPlan(plan.slice(0, idx)); return; } // clicking a step trims the plan there
    const last = plan.length ? plan[plan.length - 1] : pos;
    if (manhattan(last, p) !== 1) { say("Solo puedes añadir celdas contiguas al último paso.", "warn"); return; }
    if (plan.length >= MAX_PLAN) { say(`El plan admite como máximo ${MAX_PLAN} pasos. Ejecútalo y sigue.`, "warn"); return; }
    setPlan([...plan, p]); sfx.click();
  };
  const planStep = (dr: number, dc: number) => {
    if (running || done || mode !== "plan") return;
    const last = plan.length ? plan[plan.length - 1] : pos;
    const p = { r: last.r + dr, c: last.c + dc };
    if (inBounds(maze, p) && !isWall(maze, p)) clickCell(p);
  };

  const execute = useCallback(async () => {
    if (running || done) return;
    if (mode !== "agent") { say(`${MODES[mode].name} no tiene permiso para ejecutar. Cambia a AGENT.`, "warn"); return; }
    let route = plan;
    if (!route.length) {
      route = (shortestPath(maze, pos, false) ?? []).slice(0, IMPROVISE_STEPS);
      improvised.current = true;
      say("Sin plan, el agente improvisa en línea recta hacia la meta...", "warn");
    }
    setRunning(true); setPlan([]);
    const nowBroken = new Set(broken); const nowRevealed = new Set(revealed);
    let reached = false;
    for (const cell of route) {
      await sleep(260);
      if (!alive.current) return;
      setPos((prev) => { if (cell.c !== prev.c) setFace(cell.c < prev.c ? "l" : "r"); return cell; });
      setSteps((s) => s + 1);
      setScanned((sc) => (sc.has(key(cell)) ? sc : new Set(sc).add(key(cell))));
      const k = key(cell);
      if (maze.hazards.has(k) && !nowBroken.has(k)) {
        const known = nowRevealed.has(k);
        nowBroken.add(k); nowRevealed.add(k);
        setBroken(new Set(nowBroken)); setRevealed(new Set(nowRevealed)); setDamage((d) => d + 1);
        say(`¡Has roto ${maze.hazards.get(k)}! (-${COST.damage}) ${improvised.current ? "Sin plan, el agente fue en línea recta sin mirar." : known ? "Estaba a la vista: el plan pasaba por encima." : "Esa zona no la habías leído: el plan iba a ciegas."}`, "bad");
        sfx.hit(); shake();
      }
      if (same(cell, maze.goal)) { reached = true; break; }
    }
    setRunning(false);
    if (reached) { setDone(true); say("¡Despliegue completado! Despegando...", "good"); sfx.ok(); setTimeout(() => { if (alive.current) setShowResult(true); }, 1500); }
    else { setMode("ask"); say("El agente se detiene. Vuelve a ASK para mirar qué hay delante.", "info"); }
  }, [running, done, mode, plan, pos, broken, revealed, say, maze]);

  useEffect(() => {
    if (!started) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab") { e.preventDefault(); pickMode(mode === "ask" ? "plan" : mode === "plan" ? "agent" : "ask"); }
      else if (e.key === "1") pickMode("ask");
      else if (e.key === "2") pickMode("plan");
      else if (e.key === "3") pickMode("agent");
      else if (e.key.toLowerCase() === "r") read();
      else if (e.key === "Enter") execute();
      else if (e.key === "Backspace") setPlan((pl) => pl.slice(0, -1));
      else if (e.key.startsWith("Arrow")) { e.preventDefault(); const d = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key]; if (d) planStep(d[0], d[1]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [started, mode, pickMode, read, execute, plan, pos, running, done]);

  if (!started) {
    return (
      <LevelIntro title="NIVEL 1" subtitle="La cámara de permisos" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>Tu robot-agente debe llegar al <strong style={{ color: "var(--gold)" }}>cohete</strong> atravesando un repositorio con <strong style={{ color: "var(--bad)" }}>ficheros críticos ocultos</strong> (<code>.env</code>, <code>secrets.json</code>...). Solo puedes hacer lo que permite el <strong>modo</strong> en el que estés:</p>
        <ul className="legend">
          <li><span className="chip ask">ASK</span> investiga una zona del mapa. No planifica ni ejecuta.</li>
          <li><span className="chip plan">PLAN</span> traza la ruta paso a paso. Edición bloqueada: no la ejecuta.</li>
          <li><span className="chip agent">AGENT</span> ejecuta el plan. Sin plan, <em>improvisa</em>.</li>
        </ul>
      </LevelIntro>
    );
  }

  const planIdx = new Map(plan.map((p, i) => [key(p), i + 1]));
  const planEnd = plan.length ? plan[plan.length - 1] : pos;
  const canNext = (p: Pos) => plan.length < MAX_PLAN && manhattan(planEnd, p) === 1 && !planIdx.has(key(p)) && !same(p, pos);
  const lives = Math.max(0, LIVES - damage);

  return (
    <>
      <div className="hud"><ExitButton />
        <span className="hearts">{Array.from({ length: LIVES }, (_, i) => <i key={i} className={`sp heart ${i < lives ? "" : "off"}`} />)}</span>
        <span>LECT {reads} · PASOS {steps}/{maze.par}</span>
        <span className="pts">{final} PTS</span>
      </div>

      <div className="modes">
        {(Object.keys(MODES) as Mode[]).map((m, i) => (
          <button key={m} className={`mode ${m} ${mode === m ? "active" : ""}`} onClick={() => pickMode(m)} disabled={running || done}>
            <strong><Sprite art={MODES[m].icon} className="ico" />{MODES[m].name}</strong>
            <small>{MODES[m].perm}</small>
            <kbd>{i + 1}</kbd>
          </button>
        ))}
      </div>
      <p className={`modehint ${mode}`}>&gt; {MODES[mode].hint}</p>

      <div className={`board ${mode} ${done ? "won" : ""}`} style={{ "--cols": maze.cols, "--rows": maze.rows, "--bot-idle": robotIdleSheet(avatar), "--bot-walk": robotWalkSheet(avatar) } as React.CSSProperties}>
        {maze.map.map((row, r) => [...row].map((_, c) => {
          const p = { r, c };
          const k = key(p);
          const wall = isWall(maze, p);
          const seen = scanned.has(k);
          const cls = ["cell", "sp", wall ? `wall ${wallClass(maze, r, c)}` : seen ? `floor f${h2(r, c) % 7 < 4 ? 0 : (h2(r, c) % 3) + 1}` : "fog"];
          if (!wall && seen && r > 0 && isWall(maze, { r: r - 1, c })) cls.push("sh");
          if (planIdx.has(k)) cls.push("planned");
          if (mode === "plan" && !wall && !running && !done) { cls.push("clickable"); if (canNext(p)) cls.push("next"); }
          const isGoal = same(p, maze.goal);
          const i = planIdx.get(k);
          const prev = i ? (i === 1 ? pos : plan[i - 2]) : null;
          const next = i && i < plan.length ? plan[i] : null;
          return (
            <div key={k} className={cls.join(" ")} onClick={() => clickCell(p)}>
              {pings.has(k) && <u key={scanId} className="ping" style={{ animationDelay: `${pings.get(k)! * 70}ms` }} />}
              {isGoal && <span className={`obj sp rocket a2 ${done ? "launch" : ""}`} />}
              {!isGoal && broken.has(k) && <><span className="obj sp broken" /><span key="b" className="obj sp boom a2 once" /></>}
              {!isGoal && revealed.has(k) && !broken.has(k) && <><span className="obj sp file" /><i>{maze.hazards.get(k)}</i></>}
              {prev && <b className={`seg ${dirOf(p, prev)}`} />}
              {next && <b className={`seg ${dirOf(p, next)}`} />}
              {i && !isGoal && <span className="n">{i}</span>}
            </div>
          );
        }))}
        {plan.length > 0 && <b className={`seg0 ${dirOf(pos, plan[0])}`} style={{ left: `${((pos.c + 0.5) * 100) / maze.cols}%`, top: `${((pos.r + 0.5) * 100) / maze.rows}%` }} />}
        <div className={`bot ${running ? "run" : ""} ${face} ${done ? "gone" : ""}`} style={{ left: `${(pos.c * 100) / maze.cols}%`, top: `${(pos.r * 100) / maze.rows}%`, width: `${100 / maze.cols}%`, height: `${100 / maze.rows}%` }}><i /></div>
      </div>

      <div className="actions">
        <button className="btn ask" onClick={read} disabled={running || done}><Sprite art={ICON.mag} className="ico" />LEER (R)</button>
        <button className="btn plan" onClick={() => setPlan([])} disabled={running || done || !plan.length}>BORRAR PLAN {plan.length}/{MAX_PLAN}</button>
        <button className="btn agent" onClick={execute} disabled={running || done}><Sprite art={ICON.bolt} className="ico" />EJECUTAR</button>
      </div>

      <div className="terminal">
        {log.map((l, i) => <div key={i} className={l.tone}>&gt; {l.text}</div>)}
        <div className="cursor">&gt; _</div>
      </div>

      {showResult && (
        <LevelResult game={GAME} team={team} points={final} max={MAX_SCORE} onRetry={() => reset()} tags={tags} medals={runMedals(damage, reads)}>
          <p>
            {damage === 0 ? "Despliegue limpio: ningún fichero roto." : `${damage} fichero(s) roto(s).`}{" "}
            {reads} lectura(s), {steps} pasos (ideal: {maze.par}).
          </p>
        </LevelResult>
      )}
      {!done && <p><button className="btn ghost" onClick={() => reset()} disabled={running}>REINICIAR</button></p>}
    </>
  );
}
