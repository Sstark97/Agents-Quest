"use client";
import { useEffect, useRef, useState } from "react";
import type * as React from "react";
import {
  CARDS, MAX_SCORE, POINTS_PER_CARD, TOOL_IDS as RAILS, TOOLS,
  isRightTool, missMistake, scoreFor, type Card, type Tool,
} from "@/src/domain/levels/level-5/tool-cards";
import { shuffle } from "@/src/domain/shared/random";
import { robotIdleSheet } from "@/src/ui/art/pixel-art";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useAvatar } from "@/src/ui/hooks/useAvatar";
import { useTeamName } from "@/src/ui/hooks/useTeamName";
import { FACTORY_VARS } from "./factory-art";

const FACTS = [
  <><strong>{CARDS.length} tareas</strong>, {POINTS_PER_CARD} puntos por acierto. Con 180 de 300 superas el nivel.</>,
  <>Mueve la palanca antes de que la caja llegue al cruce; el robot avisa con «¡YA!» cuando está a punto de pasar.</>,
  <>Teclado: <kbd>1</kbd> <kbd>2</kbd> <kbd>3</kbd> o <kbd>↑</kbd> <kbd>↓</kbd>.</>,
];

const GAME = "nivel-5";
const TOOL_CLASS: Record<Tool, "ask" | "plan" | "agent"> = { editor: "ask", ide: "plan", cli: "agent" };
const SHORT: Record<Tool, string> = { editor: "EDITOR", ide: "IDE", cli: "CLI" };
const RAIL_Y: Record<Tool, number> = { editor: 4, ide: 10, cli: 16 };
// Scene geometry in cells (the stage is 40 x 20): junction, belt start, rail end and machine column.
const JX = 14, JY = 10, X0 = 1, XEND = 31.5, MX = 32;
// Timing in ms: belt travel to the junction, gap between crates, clock tick, rail speed and score pop-up.
const TRAVEL = 11000, SPAWN = 8000, TICK = 50, MS_PER_UNIT = 110, POP = 1100, URGENT = 2600;
type Route = { rail: Tool; at: number };
type Pt = [number, number];
const PATHS: Record<Tool, Pt[]> = {
  editor: [[JX, JY], [JX, RAIL_Y.editor], [XEND, RAIL_Y.editor]],
  ide: [[JX, JY], [XEND, JY]],
  cli: [[JX, JY], [JX, RAIL_Y.cli], [XEND, RAIL_Y.cli]],
};
const segs = (p: Pt[]) => p.slice(1).map((q, k) => Math.abs(q[0] - p[k][0]) + Math.abs(q[1] - p[k][1]));
const LEN: Record<Tool, number> = { editor: 0, ide: 0, cli: 0 };
RAILS.forEach((t) => { LEN[t] = segs(PATHS[t]).reduce((x, y) => x + y, 0); });
const dur = (t: Tool) => LEN[t] * MS_PER_UNIT;
const u = (n: number) => `calc(var(--u) * ${n})`;

function cratePos(i: number, now: number, route?: Route) {
  if (!route) return { x: X0 + Math.max(0, Math.min(1, (now - i * SPAWN) / TRAVEL)) * (JX - X0), y: JY, q: 0 };
  const q = Math.min(1, (now - route.at) / dur(route.rail));
  let rem = q * LEN[route.rail];
  const p = PATHS[route.rail], sg = segs(p);
  for (let k = 0; k < sg.length; k++) {
    if (rem <= sg[k] || k === sg.length - 1) {
      const f = sg[k] ? Math.min(1, rem / sg[k]) : 1;
      return { x: p[k][0] + (p[k + 1][0] - p[k][0]) * f, y: p[k][1] + (p[k + 1][1] - p[k][1]) * f, q };
    }
    rem -= sg[k];
  }
  return { x: XEND, y: RAIL_Y[route.rail], q };
}

export function Level5Screen() {
  const team = useTeamName();
  const avatar = useAvatar();
  const [started, setStarted] = useState(false);
  const [deck, setDeck] = useState<Card[]>([]);
  const [lever, setLever] = useState<Tool>("ide");
  const [now, setNow] = useState(0);
  const [routes, setRoutes] = useState<Record<number, Route>>({});
  const leverRef = useRef<Tool>("ide");
  const t0 = useRef(0);
  const routed = useRef<Set<number>>(new Set());

  const move = (t: Tool) => { setLever(t); leverRef.current = t; };
  const start = () => {
    setDeck(shuffle(CARDS)); move("ide"); setRoutes({}); routed.current = new Set(); setNow(0);
    t0.current = performance.now(); setStarted(true);
  };

  const done = started && deck.length > 0 && deck.every((_, i) => routes[i] && now >= routes[i].at + dur(routes[i].rail) + POP);

  useEffect(() => {
    if (!started || done) return;
    const id = setInterval(() => {
      const n = performance.now() - t0.current;
      setNow(n);
      deck.forEach((_, i) => {
        const arrive = i * SPAWN + TRAVEL;
        if (n >= arrive && !routed.current.has(i)) {
          routed.current.add(i);
          setRoutes((r) => ({ ...r, [i]: { rail: leverRef.current, at: arrive } }));
          if (isRightTool(deck[i], leverRef.current)) sfx.ok(); else { sfx.bad(); shake(); }
        }
      });
    }, TICK);
    return () => clearInterval(id);
  }, [started, done, deck]);

  useEffect(() => {
    if (!started || done) return;
    const onKey = (e: KeyboardEvent) => {
      const k = RAILS.indexOf(leverRef.current);
      if (e.key === "1") move("editor"); else if (e.key === "2") move("ide"); else if (e.key === "3") move("cli");
      else if (e.key === "ArrowUp") { e.preventDefault(); move(RAILS[Math.max(0, k - 1)]); }
      else if (e.key === "ArrowDown") { e.preventDefault(); move(RAILS[Math.min(2, k + 1)]); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [started, done]);

  const result = (i: number) => (routes[i] ? isRightTool(deck[i], routes[i].rail) : null);
  const correct = deck.filter((_, i) => result(i) === true).length;
  const points = scoreFor(correct);

  if (!started) {
    return (
      <LevelIntro title="NIVEL 5" subtitle="La palanca de railes" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>Las tareas llegan por la <strong style={{ color: "var(--gold)" }}>cinta</strong> y, en el cruce, siguen por el rail en el que esté <strong style={{ color: "var(--gold)" }}>la palanca</strong> en ese instante. Cada rail es una herramienta:</p>
        <ul className="legend">
          {RAILS.map((t, k) => (
            <li key={t}><span className={`chip ${TOOL_CLASS[t]}`}>{k + 1} · {TOOLS[t].name}</span>{TOOLS[t].control}.</li>
          ))}
        </ul>
      </LevelIntro>
    );
  }

  if (done) {
    const misses = deck.map((c, i) => ({ c, i })).filter(({ i }) => result(i) === false);
    return (
      <LevelResult game={GAME} team={team} points={points} max={MAX_SCORE} onRetry={start} tags={misses.map(({ c }) => missMistake(c))}>
        <p>{correct}/{CARDS.length} tareas enviadas al rail correcto.</p>
        {misses.map(({ c, i }) => (
          <p key={i} className="fb warn">«{c.text}» → {TOOLS[c.tool].name} (la enviaste a {TOOLS[routes[i].rail].name}). {c.why}</p>
        ))}
      </LevelResult>
    );
  }

  const spawned = deck.map((_, i) => i).filter((i) => now >= i * SPAWN);
  const front = spawned.find((i) => !routes[i]);
  const routedIdx = Object.keys(routes).map(Number);
  const last = routedIdx.length ? routedIdx.reduce((a, b) => (routes[a].at >= routes[b].at ? a : b)) : null;
  const lastOk = last !== null ? result(last) : null;
  const arrivals = (t: Tool) => deck.map((_, i) => i).filter((i) => routes[i]?.rail === t && now >= routes[i].at + dur(t));
  const recent = (t: Tool) => arrivals(t).filter((i) => now < routes[i].at + dur(t) + POP).pop();
  const urgent = front !== undefined && front * SPAWN + TRAVEL - now < URGENT;

  return (
    <>
      <div className="hud"><ExitButton /><span>TAREAS {Object.keys(routes).length}/{deck.length}</span><span>ACIERTOS {correct}</span><span className="pts">{points} PTS</span></div>

      <div className="beltcard" data-i={front ?? ""}>
        {front !== undefined ? deck[front].text : "Última tarea en camino por el rail..."}
        {front !== undefined && <div className="timer"><div style={{ width: `${Math.min(100, ((now - front * SPAWN) / TRAVEL) * 100)}%`, transition: "none" }} /></div>}
      </div>

      <div className="stage">
        <div className="scene" style={{ ...FACTORY_VARS, "--bot-idle": robotIdleSheet(avatar) } as React.CSSProperties}>
          <div className="pipe" style={{ left: 0, top: 0, width: u(40) }} />
          <div className="plates" style={{ left: 0, top: u(18.4), width: u(40), height: u(1.6) }} />
          <div className="hazard" style={{ left: 0, top: u(18.3), width: u(40) }} />
          {[1.6, 7].map((x) => <div key={x} className="win" style={{ left: u(x), top: u(1.9) }} />)}
          {[6.3, 22].map((x) => <div key={x} className="lamp" style={{ left: u(x), top: u(1.5) }} />)}
          <div className="gear big" style={{ left: u(1), top: u(12.6) }} />
          <div className="gear mid" style={{ left: u(4.6), top: u(14.9) }} />
          <div className="warn" style={{ left: u(9.2), top: u(14.4) }} />
          <div className="hopper" style={{ left: u(0.3), top: u(5.4) }} />
          <span className="tag" style={{ left: u(4), top: u(7.4) }}>ENTRADA</span>

          <div className="belt h in" style={{ left: 0, top: u(9), width: u(12.5) }} />
          <div className={`belt v up ${lever === "editor" ? "on editor" : ""}`} style={{ left: u(13), top: u(5), height: u(3.5) }} />
          <div className={`belt h ${lever === "editor" ? "on editor" : ""}`} style={{ left: u(13), top: u(3), width: u(19) }} />
          <div className={`belt h ${lever === "ide" ? "on ide" : ""}`} style={{ left: u(15.5), top: u(9), width: u(16.5) }} />
          <div className={`belt v down ${lever === "cli" ? "on cli" : ""}`} style={{ left: u(13), top: u(11.5), height: u(3.5) }} />
          <div className={`belt h ${lever === "cli" ? "on cli" : ""}`} style={{ left: u(13), top: u(15), width: u(19) }} />
          <div className={`corner ${lever === "editor" ? "on editor" : ""}`} style={{ left: u(13), top: u(3) }} />
          <div className={`corner c2 ${lever === "cli" ? "on cli" : ""}`} style={{ left: u(13), top: u(15) }} />

          <div className="swbox" style={{ left: u(12.5), top: u(8.5) }} />
          <div className="lever" style={{ left: u(JX), top: u(JY) }}>
            <i style={{ transform: `rotate(${lever === "editor" ? -90 : lever === "cli" ? 90 : 0}deg)` }} />
            <b />
          </div>
          <div className="op" style={{ left: u(17), top: u(11.9) }}>{urgent && <span className="bubble">¡YA!</span>}</div>

          {RAILS.map((t) => {
            const r = recent(t);
            const top = RAIL_Y[t] - 3.5;
            return (
              <div key={t} className={`machine ${TOOL_CLASS[t]} ${r !== undefined ? "hit" : ""}`} style={{ left: u(MX), top: u(top), backgroundImage: `var(--s-machine-${t})` }}>
                <strong>{SHORT[t]}</strong>
                <span className="mlamp" data-s={r === undefined ? "" : result(r) ? "ok" : "ko"} />
                <span className="pips">{arrivals(t).map((i) => <i key={i} className={result(i) ? "ok" : "ko"} />)}</span>
                <span className="puff" style={{ left: u(6.4) }} /><span className="puff p2" style={{ left: u(6.4) }} />
                {r !== undefined && <span key={r} className={`pop ${result(r) ? "ok" : "ko"}`}>{result(r) ? `+${POINTS_PER_CARD}` : "✗"}</span>}
              </div>
            );
          })}

          {spawned.map((i) => {
            const p = cratePos(i, now, routes[i]);
            if (p.q >= 1) return null;
            const r = result(i);
            return <div key={i} className={`crate ${r === null ? "" : r ? "ok" : "ko"}`} style={{ left: u(p.x), top: u(p.y) }} title={deck[i].text}><span>{i + 1}</span></div>;
          })}
        </div>
      </div>

      <div className="muted" style={{ margin: "0 4px 6px" }}>PALANCA (cambia el rail del cruce)</div>
      <div className="bins">
        {RAILS.map((t, k) => (
          <button key={t} className={`bin ${TOOL_CLASS[t]} ${lever === t ? "sel" : ""}`} onClick={() => move(t)}>
            <strong>{k + 1} · {TOOLS[t].name}</strong>
            <small>{TOOLS[t].control}</small>
          </button>
        ))}
      </div>

      {last !== null && (
        <div className="card">
          <h2 style={{ color: lastOk ? "var(--ok)" : "var(--bad)" }}>{lastOk ? `¡BIEN! +${POINTS_PER_CARD}` : "RAIL EQUIVOCADO"}</h2>
          <p className="muted">«{deck[last].text}»</p>
          <p className={`fb ${lastOk ? "good" : "warn"}`}>{!lastOk && <strong>{TOOLS[deck[last].tool].name}. </strong>}{deck[last].why}</p>
        </div>
      )}
    </>
  );
}
