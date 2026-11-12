"use client";
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import {
  ENEMIES, MAX_SCORE, RULES, SLOTS, WAVES,
  blockedBehaviours, enemyCounts, findRule as rule, waveMistakes, waveReport, waveScore, type EnemyType, type WaveReport,
} from "@/src/domain/levels/level-4/rules-defense";
import { shuffle } from "@/src/domain/shared/random";
import { P, bugSheet, bugUrl, repoCore, spriteUrl, tower } from "@/src/ui/art/pixel-art";
import { sfx } from "@/src/ui/audio/sound";
import { ExitButton } from "@/src/ui/components/ExitButton";
import { LevelIntro } from "@/src/ui/components/LevelIntro";
import { LevelResult } from "@/src/ui/components/LevelResult";
import { shake } from "@/src/ui/effects";
import { useTeamName } from "@/src/ui/hooks/useTeamName";

const FACTS = [
  <><strong>3 oleadas</strong>, hasta 100 puntos cada una según los enemigos que frenes. Con 180 de 300 superas el nivel.</>,
  <>Antes de cada oleada ves qué enemigos vienen. Caben {SLOTS} reglas; pulsa una ya añadida para quitarla.</>,
];

const GAME = "nivel-4";
// Scene geometry, in % of the scene width, and animation timing in ticks.
const TOWER_X = 46, CORE_X = 10, SPEED = 1.5, GAP = 13;
const TICK_MS = 90, VANISH_TICKS = 6, FIRE_TICKS = 4, CORE_HIT_TICKS = 5;
type EnemySprite = { id: number; type: EnemyType; x: number; st: "walk" | "dead" | "leak"; age: number; checked: boolean };
const hasVanished = (enemy: EnemySprite) => enemy.st !== "walk" && enemy.age >= VANISH_TICKS;

/** Moves one enemy a tick forward: the tower stops it if a rule names its behaviour, otherwise it reaches the repository. */
function advance(enemy: EnemySprite, blocked: Set<EnemyType>): EnemySprite {
  if (enemy.st !== "walk") return { ...enemy, age: enemy.age + 1 };
  const x = enemy.x - SPEED;
  if (!enemy.checked && x <= TOWER_X) return blocked.has(enemy.type) ? { ...enemy, x, st: "dead", age: 0, checked: true } : { ...enemy, x, checked: true };
  if (x <= CORE_X) return { ...enemy, x, st: "leak", age: 0 };
  return { ...enemy, x };
}

const TYPES = Object.keys(ENEMIES) as EnemyType[];
const shapeOf = (t: EnemyType) => TYPES.indexOf(t) % 3;
const SCENE = { "--s-tower": spriteUrl(tower(false), P), "--s-tower-on": spriteUrl(tower(true), P), "--s-core": spriteUrl(repoCore(false), P), "--s-core-hit": spriteUrl(repoCore(true), P) } as React.CSSProperties;
const STARS = Array.from({ length: 26 }, (_, i) => ({ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 58}%`, animationDelay: `${(i % 7) * 0.4}s` }));

export function Level4Screen() {
  const team = useTeamName();
  const [started, setStarted] = useState(false);
  const [wave, setWave] = useState(0);
  const [hand, setHand] = useState<string[]>([]);
  const [slots, setSlots] = useState<string[]>([]);
  const [phase, setPhase] = useState<"prep" | "run" | "done">("prep");
  const [enemies, setEnemies] = useState<EnemySprite[]>([]);
  const [blocked, setBlocked] = useState<Set<EnemyType>>(new Set());
  const [scores, setScores] = useState<number[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [report, setReport] = useState<WaveReport | null>(null);

  const total = scores.reduce((a, b) => a + b, 0);

  const start = () => { setHand(shuffle(RULES.map((r) => r.id))); setSlots([]); setScores([]); setTags([]); setWave(0); setPhase("prep"); setReport(null); setMsg(""); setStarted(true); };

  const toggle = (id: string) => {
    if (phase !== "prep") return;
    if (slots.includes(id)) { setSlots(slots.filter((s) => s !== id)); setMsg(""); return; }
    if (slots.length >= SLOTS) { setMsg(`AGENTS.md admite ${SLOTS} reglas: un fichero corto se respeta. Quita una antes.`); return; }
    setSlots([...slots, id]); setMsg("");
  };

  const launch = () => {
    setBlocked(blockedBehaviours(slots));
    setEnemies(WAVES[wave].enemies.map((type, i) => ({ id: i, type, x: 100 + i * GAP, st: "walk", age: 0, checked: false })));
    setPhase("run");
  };

  useEffect(() => {
    if (phase !== "run") return;
    const t = setInterval(() => {
      setEnemies((previous) => previous.map((enemy) => advance(enemy, blocked)));
    }, TICK_MS);
    return () => clearInterval(t);
  }, [phase, blocked]);

  useEffect(() => {
    if (phase !== "run" || !enemies.length || !enemies.every(hasVanished)) return;
    const result = waveReport(wave, slots, {
      stopped: enemies.filter((e) => e.st === "dead").length,
      total: enemies.length,
      leaked: enemies.filter((e) => e.st === "leak").map((e) => e.type),
    });
    setReport(result);
    setTags((current) => [...current, ...waveMistakes(result)]);
    if (result.leaked.length === 0) sfx.ok(); else { sfx.bad(); shake(); }
    setScores((current) => [...current, waveScore(result)]);
    setPhase("done");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enemies, phase]);

  const next = () => { setWave(wave + 1); setPhase("prep"); setReport(null); setEnemies([]); setMsg(""); };
  const counts = useMemo(() => enemyCounts(wave), [wave]);

  const firing = new Set<number>();
  enemies.forEach((e) => { if (e.st === "dead" && e.age < FIRE_TICKS) { const i = slots.findIndex((sl) => rule(sl).blocks === e.type); if (i >= 0) firing.add(i); } });
  const coreHit = enemies.some((e) => e.st === "leak" && e.age < CORE_HIT_TICKS);

  if (!started) {
    return (
      <LevelIntro title="NIVEL 4" subtitle="Torres de defensa" team={team} game={GAME} onStart={start} facts={FACTS}>
        <p>El agente es rápido y se salta las normas si no se las dices. Cada <strong style={{ color: "var(--gold)" }}>regla de AGENTS.md</strong> es una torre que frena un mal comportamiento.</p>
        <ul className="legend">
          <li>Llegan <strong>oleadas de malas prácticas</strong> hacia tu repositorio.</li>
          <li>Solo caben <strong>{SLOTS} reglas</strong>: un AGENTS.md corto se respeta.</li>
          <li>Una regla <strong style={{ color: "var(--bad)" }}>vaga</strong> («cuida la seguridad») no frena nada. Una <strong style={{ color: "var(--ok)" }}>concreta</strong> sí.</li>
          <li>Puedes reescribir AGENTS.md entre oleada y oleada.</li>
        </ul>
      </LevelIntro>
    );
  }

  if (wave >= WAVES.length) {
    return <LevelResult game={GAME} team={team} points={total} max={MAX_SCORE} onRetry={start} tags={tags} />;
  }

  return (
    <>
      <div className="hud"><ExitButton /><span>{WAVES[wave].name}</span><span>REGLAS {slots.length}/{SLOTS}</span><span className="pts">{total} PTS</span></div>

      <div className="stage"><div className="scene td" style={SCENE}>
        {STARS.map((st, i) => <i key={i} className="star" style={st} />)}
        <div className="moon" />
        <div className="tdground" />
        <div className={`core ${coreHit ? "hit" : ""}`} />
        <div className="tag" style={{ left: "1.5%", bottom: "calc(var(--u) * 8.2)" }}>REPO</div>
        <div className="tdbanner" style={{ left: `${TOWER_X}%` }}>AGENTS.md</div>
        {Array.from({ length: SLOTS }, (_, i) => {
          const id = slots[i]; const fire = id !== undefined && firing.has(i);
          return <div key={i} className={`twr ${id ? "" : "empty"} ${fire ? "fire" : ""}`} style={{ left: `calc(${TOWER_X}% + var(--u) * ${(i - (SLOTS - 1) / 2) * 3.4})` }}>{fire && <b />}</div>;
        })}
        {enemies.map((e) => (hasVanished(e) ? null : (
          <i key={e.id} className={`enemy ${e.st === "walk" ? "a2" : "sp boom a2"}`}
            style={{ left: `${e.x}%`, backgroundImage: e.st === "walk" ? bugSheet(shapeOf(e.type), ENEMIES[e.type].color) : undefined }} />
        )))}
        {phase === "prep" && <div className="tdhint">Los enemigos entrarán por aquí →</div>}
      </div></div>

      {phase === "prep" && (
        <>
          <div className="card">
            <div className="muted">ENEMIGOS DE ESTA OLEADA</div>
            <div className="preview">
              {counts.map(([t, n]) => (
                <span key={t} className="pv"><i className="sp" style={{ backgroundImage: bugUrl(shapeOf(t), ENEMIES[t].color) }} />{n}× {ENEMIES[t].name}</span>
              ))}
            </div>
          </div>

          <div className="muted" style={{ margin: "14px 4px 6px" }}>TU AGENTS.md (clic en una regla para quitarla)</div>
          <div className="agentsmd">
            {Array.from({ length: SLOTS }, (_, i) => slots[i]
              ? <button key={i} className="ruleslot on" onClick={() => toggle(slots[i])}>{rule(slots[i]).text}</button>
              : <div key={i} className="ruleslot">— hueco libre —</div>)}
          </div>
          {msg && <p className="fb warn">{msg}</p>}

          <div className="muted" style={{ margin: "14px 4px 6px" }}>REGLAS DISPONIBLES</div>
          <div className="hand">
            {hand.map((id) => <button key={id} className={`rulecard ${slots.includes(id) ? "used" : ""}`} onClick={() => toggle(id)}>{rule(id).text}</button>)}
          </div>
          <p><button className="btn agent start" onClick={launch}>LANZAR OLEADA</button></p>
        </>
      )}

      {phase === "run" && <p className="muted" style={{ margin: 8 }}>&gt; Los enemigos avanzan hacia el repositorio...</p>}

      {phase === "done" && report && (
        <div className="card">
          <h2>{report.stopped}/{report.total} FRENADOS · +{scores[scores.length - 1]} PTS</h2>
          {report.leaked.length > 0 && <p className="fb bad">Se colaron: {report.leaked.map((t) => ENEMIES[t].name).join(", ")}. Ninguna regla de tu AGENTS.md nombraba ese comportamiento, así que el agente no tenía por qué evitarlo.</p>}
          {report.vague.length > 0 && <p className="fb bad">Torres apagadas: {report.vague.map((t) => `«${t}»`).join(" · ")}. No dicen qué hacer ni cómo comprobar si se ha cumplido, así que no frenan nada y ocupan un hueco.</p>}
          {report.idle.length > 0 && <p className="fb warn">Reglas concretas que hoy no hicieron falta: {report.idle.map((t) => `«${t}»`).join(" · ")}. En esta oleada no venía ese enemigo.</p>}
          {report.leaked.length === 0 && <p className="fb good">¡Defensa perfecta!</p>}
          <button className="btn" onClick={next}>{wave + 1 >= WAVES.length ? "VER RESULTADO" : "SIGUIENTE OLEADA"}</button>
        </div>
      )}
    </>
  );
}
