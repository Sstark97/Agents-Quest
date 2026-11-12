"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { sfx } from "@/src/ui/audio/sound";

/**
 * Playable 20-second practices. They teach the controls of each level with examples
 * from another world (a kitchen, a shared flat...) so they do not give away the answers of the level.
 */
type P = { onDone: () => void };

/** Row of steps: the current one highlighted, the finished ones ticked. */
function Steps({ labels, at }: { labels: string[]; at: number }) {
  return <ol className="psteps">{labels.map((l, i) => <li key={l} className={i < at ? "ok" : i === at ? "now" : ""}>{i < at ? "✔ " : `${i + 1} · `}{l}</li>)}</ol>;
}

/* ---------- Level 1: every mode allows a single thing ---------- */
const G1 = { rows: 3, cols: 5, start: "1,0", goal: "1,4", trap: "1,2" };
const near = (a: string, b: string) => { const [r1, c1] = a.split(",").map(Number), [r2, c2] = b.split(",").map(Number); return Math.abs(r1 - r2) + Math.abs(c1 - c2) === 1; };
type M1 = "ask" | "plan" | "agent";
const M1S: { id: M1; name: string }[] = [{ id: "ask", name: "ASK" }, { id: "plan", name: "PLAN" }, { id: "agent", name: "AGENT" }];

function Practice1({ onDone }: P) {
  const [mode, setMode] = useState<M1>("ask");
  const [seen, setSeen] = useState(false);
  const [path, setPath] = useState<string[]>([]);
  const [pos, setPos] = useState(G1.start);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [note, setNote] = useState("");
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);
  const end = path.length ? path[path.length - 1] : G1.start;
  const ready = end === G1.goal;
  const step = won ? 3 : !seen ? 0 : !ready ? 1 : 2;
  const want: M1 = step === 0 ? "ask" : step === 1 ? "plan" : "agent";
  const guide = won ? "¡Llegaste! Has usado los tres modos en orden."
    : mode !== want ? `Cambia al modo ${want.toUpperCase()}.`
    : step === 0 ? "Estás en ASK: pulsa LEER para descubrir el tablero."
    : step === 1 ? "Estás en PLAN: pulsa las casillas marcadas, una a una, hasta el cohete. Rodea lo que has descubierto."
    : "Estás en AGENT: pulsa EJECUTAR y el robot seguirá tu plan.";

  const pick = (m: M1) => { if (!running && !won) { setMode(m); setNote(""); sfx.click(); } };
  const read = () => {
    if (mode !== "ask") { setNote("Solo ASK puede leer."); return; }
    setSeen(true); setNote("Había algo frágil escondido en el camino recto."); sfx.click();
  };
  const click = (k: string) => {
    if (running || won) return;
    if (mode !== "plan") { setNote("Solo PLAN puede trazar la ruta."); return; }
    const i = path.indexOf(k);
    if (i >= 0) { setPath(path.slice(0, i)); return; }
    if (k === G1.start || !near(end, k) || ready) return;
    setPath([...path, k]); setNote(""); sfx.click();
  };
  const run = () => {
    if (mode !== "agent") { setNote("Solo AGENT puede ejecutar."); return; }
    if (!ready) { setNote("El plan aún no llega al cohete."); return; }
    setRunning(true); setNote("");
    let i = 0;
    timer.current = setInterval(() => {
      const k = path[i++];
      setPos(k);
      if (k === G1.trap) {
        clearInterval(timer.current!); sfx.hit();
        setNote("¡Roto! El robot hace justo lo que pone el plan. Vuelve a PLAN y traza otra ruta.");
        setTimeout(() => { setPos(G1.start); setPath([]); setRunning(false); }, 900);
      } else if (k === G1.goal) { clearInterval(timer.current!); setRunning(false); setWon(true); sfx.ok(); onDone(); }
    }, 260);
  };

  return (
    <>
      <Steps labels={["ASK: lee", "PLAN: traza", "AGENT: ejecuta"]} at={step} />
      <p className="pmsg">&gt; {guide}{note && <><br /><span className="fb warn">{note}</span></>}</p>
      <div className="pmodes">
        {M1S.map((m) => <button key={m.id} className={`${m.id} ${mode === m.id ? "on" : ""} ${!won && mode !== want && m.id === want ? "hint" : ""}`} onClick={() => pick(m.id)}>{m.name}</button>)}
      </div>
      <div className="pgrid" style={{ gridTemplateColumns: `repeat(${G1.cols}, 1fr)` }}>
        {Array.from({ length: G1.rows * G1.cols }, (_, n) => {
          const k = `${Math.floor(n / G1.cols)},${n % G1.cols}`;
          const idx = path.indexOf(k) + 1;
          const can = mode === "plan" && seen && !running && !ready && !idx && k !== G1.start && near(end, k);
          return (
            <button key={k} className={`pcell ${seen ? "" : "fog"} ${idx ? "on" : ""} ${can ? "next" : ""}`} onClick={() => click(k)}>
              {pos === k ? <i className="sp robot" /> : k === G1.goal ? <i className="sp rocket a2" /> : seen && k === G1.trap ? <i className="sp file" /> : idx ? idx : ""}
            </button>
          );
        })}
      </div>
      <div className="row">
        <button className="btn ask" onClick={read} disabled={seen || running}>LEER</button>
        <button className="btn agent" onClick={run} disabled={running || won}>EJECUTAR</button>
      </div>
    </>
  );
}

/* ---------- Level 2: one option per part ---------- */
const PIZZA: { label: string; hint: string; opts: [string, string] }[] = [
  { label: "OBJETIVO", hint: "qué quieres", opts: ["Tráeme algo rico.", "Una margarita mediana, sin cebolla."] },
  { label: "REFERENCIAS", hint: "de qué parte", opts: ["Ya sabes dónde vivo.", "Calle Mayor 3, 2º B. El timbre no funciona."] },
  { label: "WORKFLOW", hint: "cómo te avisa", opts: ["Ven cuando puedas.", "Llámame al salir y otra vez en el portal."] },
];
function Practice2({ onDone }: P) {
  const [picks, setPicks] = useState<(number | undefined)[]>([undefined, undefined, undefined]);
  const [sent, setSent] = useState(false);
  const order = useRef(PIZZA.map(() => (Math.random() < 0.5 ? [0, 1] : [1, 0]))).current;
  const good = picks.filter((p) => p === 1).length;
  const chosen = picks.filter((p) => p !== undefined).length;
  const send = () => { setSent(true); if (good === 3) sfx.ok(); else sfx.bad(); onDone(); };
  return (
    <>
      <Steps labels={["Elige las 3 partes", "Envía el pedido"]} at={sent ? 2 : chosen === 3 ? 1 : 0} />
      <p className="pmsg">&gt; Pides una pizza por teléfono. Elige una frase en cada parte ({chosen}/3) y envía el pedido.</p>
      {PIZZA.map((s, i) => (
        <div key={s.label} className="pslot">
          <span className="chip ask" title={s.hint}>{s.label}</span>
          <div className="opts">
            {order[i].map((o) => <button key={o} className={`opt ${picks[i] === o ? "on" : ""}`} disabled={sent} onClick={() => { setPicks(picks.map((p, k) => (k === i ? o : p))); sfx.click(); }}>{s.opts[o]}</button>)}
          </div>
        </div>
      ))}
      {!sent ? <button className="btn agent" disabled={chosen < 3} onClick={send}>ENVIAR PEDIDO</button>
        : <p className={`fb ${good === 3 ? "good" : "warn"}`}>{good === 3 ? "Llega justo lo que querías, a tu puerta." : `${3 - good} parte(s) del pedido quedaron al azar: el repartidor tuvo que adivinar.`}</p>}
    </>
  );
}

/* ---------- Level 3: the desk fills up ---------- */
const CAP3 = 4;
const KITCHEN = [
  { id: "receta", name: "Receta de tortilla", size: 1, need: true },
  { id: "huevos", name: "Huevos y papas", size: 1, need: true },
  { id: "sarten", name: "Sartén", size: 1, need: true },
  { id: "lavadora", name: "Manual de la lavadora", size: 2, need: false },
  { id: "folletos", name: "Folletos del súper", size: 2, need: false },
];
function Practice3({ onDone }: P) {
  const [desk, setDesk] = useState<string[]>([]);
  const [msg, setMsg] = useState("Vas a hacer una tortilla. Pulsa cosas de la despensa para ponerlas en la encimera (caben 4 huecos; ■ = 1 hueco).");
  const [ran, setRan] = useState(false);
  const order = useRef([...KITCHEN].sort(() => Math.random() - 0.5)).current;
  const item = (id: string) => KITCHEN.find((k) => k.id === id)!;
  const used = desk.reduce((n, id) => n + item(id).size, 0);
  const add = (id: string) => {
    const next = [...desk, id]; const out: string[] = [];
    while (next.reduce((n, x) => n + item(x).size, 0) > CAP3) out.push(next.shift()!);
    setDesk(next); sfx.click();
    setMsg(out.length ? `No cabe todo: se cae ${out.map((x) => item(x).name).join(", ")} (lo más antiguo).` : "Pulsa algo de la encimera para quitarlo. Cuando esté lista, pulsa COCINAR.");
  };
  const run = () => {
    const missing = KITCHEN.filter((k) => k.need && !desk.includes(k.id));
    const noise = desk.filter((id) => !item(id).need);
    setRan(true);
    if (!missing.length && !noise.length) { sfx.ok(); setMsg("Encimera justa: todo lo necesario y nada más."); }
    else { sfx.bad(); setMsg(`${missing.length ? `Falta: ${missing.map((m) => m.name).join(", ")}. ` : ""}${noise.length ? `Sobra: ${noise.map((n) => item(n).name).join(", ")}, y estorba.` : ""}`); }
    onDone();
  };
  return (
    <>
      <Steps labels={["Carga la encimera", "Cocina"]} at={ran ? 2 : desk.length ? 1 : 0} />
      <p className="pmsg">&gt; {msg}</p>
      <div className="pdesk">{desk.length === 0 && <span className="muted">Encimera vacía</span>}{desk.map((id) => <button key={id} style={{ flexGrow: item(id).size }} onClick={() => !ran && setDesk(desk.filter((x) => x !== id))}>{item(id).name}</button>)}<em>{used}/{CAP3}</em></div>
      <div className="pshelf">{order.map((k) => <button key={k.id} className="opt" disabled={ran || desk.includes(k.id)} onClick={() => add(k.id)}>{k.name} <small>{"■".repeat(k.size)}</small></button>)}</div>
      <button className="btn agent" disabled={ran || !desk.length} onClick={run}>COCINAR</button>
    </>
  );
}

/* ---------- Level 4: one rule against one problem ---------- */
const FLAT = [
  { text: "Sé buen compañero de piso.", ok: false },
  { text: "Friega tus platos antes de acostarte.", ok: true },
  { text: "Eres el mejor compañero del mundo.", ok: false },
];
function Practice4({ onDone }: P) {
  const [pick, setPick] = useState<number | null>(null);
  const [res, setRes] = useState<boolean | null>(null);
  const order = useRef([0, 1, 2].sort(() => Math.random() - 0.5)).current;
  const launch = () => { const ok = FLAT[pick!].ok; setRes(ok); if (ok) sfx.ok(); else sfx.bad(); onDone(); };
  return (
    <>
      <Steps labels={["Elige una norma", "Pruébala"]} at={res !== null ? 2 : pick !== null ? 1 : 0} />
      <p className="pmsg">&gt; Problema del piso: alguien deja los platos sin fregar. Cuelga UNA norma en la nevera y comprueba si lo frena.</p>
      <div className="opts">{order.map((i) => <button key={i} className={`opt ${pick === i ? "on" : ""}`} onClick={() => { setPick(i); setRes(null); sfx.click(); }}>{FLAT[i].text}</button>)}</div>
      <p><button className="btn agent" disabled={pick === null} onClick={launch}>PROBAR LA NORMA</button></p>
      {res !== null && <p className={`fb ${res ? "good" : "bad"}`}>{res ? "Frenado: la norma dice qué hacer y cuándo." : "Los platos siguen ahí: con esa norma nadie sabe qué tiene que hacer. Elige otra y vuelve a probar."}</p>}
    </>
  );
}

/* ---------- Level 5: move the lever in time ---------- */
const TARGETS = [3, 1];
function Practice5({ onDone }: P) {
  const [n, setN] = useState(0);
  const [lever, setLever] = useState(2);
  const [last, setLast] = useState<boolean | null>(null);
  const ref = useRef(2);
  const move = (r: number) => { setLever(r); ref.current = r; sfx.click(); };
  const arrive = () => {
    const ok = ref.current === TARGETS[n];
    setLast(ok); if (ok) sfx.ok(); else sfx.bad();
    if (n + 1 >= TARGETS.length) onDone();
    setN(n + 1);
  };
  const live = n < TARGETS.length;
  return (
    <>
      <Steps labels={["Caja 1", "Caja 2"]} at={n} />
      <p className="pmsg">&gt; {live ? <>Esta caja tiene que ir al <strong>RAIL {TARGETS[n]}</strong>. Pulsa ese rail antes de que la caja llegue al cruce (✕).</> : "Así funciona: la caja sigue por el rail que marque la palanca en el instante en que pasa por el cruce."}</p>
      <div className="ptrack">{live && <i key={n} className="pcrate" onAnimationEnd={arrive} />}<b>✕</b></div>
      {last !== null && <p className={`fb ${last ? "good" : "bad"}`}>{last ? "¡Al rail correcto!" : "Rail equivocado: la palanca estaba en otro sitio cuando pasó la caja."}</p>}
      <div className="bins">{[1, 2, 3].map((r) => <button key={r} className={`bin ${lever === r ? "sel" : ""}`} onClick={() => move(r)}><strong>RAIL {r}</strong></button>)}</div>
    </>
  );
}

/* ---------- Level 6: split the work between two ---------- */
const MOVE = [
  { id: "trastero", text: "Vaciar el trastero", load: 3 },
  { id: "decidir", text: "Decidir qué muebles tuyos se tiran", load: 1, you: true },
  { id: "estante", text: "Montar la estantería", load: 2 },
];
function Practice6({ onDone }: P) {
  const [who, setWho] = useState<Record<string, "yo" | "amiga">>({});
  const [res, setRes] = useState<string[] | null>(null);
  const mine = MOVE.filter((m) => who[m.id] === "yo").reduce((n, m) => n + m.load, 0);
  const all = MOVE.every((m) => who[m.id]);
  const go = () => {
    const out: string[] = [];
    if (mine > 3) out.push(`Te has quedado ${mine} horas de trabajo y solo tienes 3: no llegas.`);
    if (who.decidir === "amiga") out.push("Tu amiga no sabe qué muebles quieres conservar ni puede preguntártelo: decidirá por su cuenta.");
    setRes(out); if (out.length) sfx.bad(); else sfx.ok(); onDone();
  };
  return (
    <>
      <Steps labels={["Reparte las 3 tareas", "Empieza la mudanza"]} at={res ? 2 : all ? 1 : 0} />
      <p className="pmsg">&gt; Mudanza con una amiga. Tú tienes 3 horas (■ = 1 hora); ella trabaja a la vez en otra habitación y no puede consultarte. Tus horas: {mine}/3.</p>
      {MOVE.map((m) => (
        <div key={m.id} className="pslot">
          <span>{m.text} <small style={{ color: "var(--gold)" }}>{"■".repeat(m.load)}</small></span>
          <div className="row">
            {(["yo", "amiga"] as const).map((w) => <button key={w} className={`opt ${who[m.id] === w ? "on" : ""}`} onClick={() => { setWho({ ...who, [m.id]: w }); setRes(null); sfx.click(); }}>{w === "yo" ? "YO" : "MI AMIGA"}</button>)}
          </div>
        </div>
      ))}
      <button className="btn agent" disabled={!all} onClick={go}>EMPEZAR LA MUDANZA</button>
      {res && (res.length === 0 ? <p className="fb good">Buen reparto: lo pesado va en paralelo y lo que solo sabes tú lo haces tú.</p> : res.map((t) => <p key={t} className="fb bad">{t} Cambia el reparto y prueba otra vez.</p>))}
    </>
  );
}

const BY_GAME: Record<string, { body: (p: P) => ReactNode; after: string }> = {
  "nivel-1": { body: (p) => <Practice1 {...p} />, after: "En el nivel el mapa es mucho mayor y cada lectura solo descubre una zona: tendrás que repetir el ciclo varias veces." },
  "nivel-2": { body: (p) => <Practice2 {...p} />, after: "En el nivel hay tres opciones por parte y lo que pides es un cambio de código." },
  "nivel-3": { body: (p) => <Practice3 {...p} />, after: "En el nivel la mesa tiene 8 huecos y no se vacía sola entre una tarea y la siguiente." },
  "nivel-4": { body: (p) => <Practice4 {...p} />, after: "En el nivel eliges 4 reglas para frenar oleadas de varios enemigos distintos." },
  "nivel-5": { body: (p) => <Practice5 {...p} />, after: "En el nivel cada caja trae una tarea y tú decides a qué rail debe ir." },
  "nivel-6": { body: (p) => <Practice6 {...p} />, after: "En el nivel repartes entre un agente principal y dos subagentes, y además cuenta qué ficheros toca cada tarea." },
};

/** "Try it first" block: it does not score and can be repeated. */
export function Practice({ game }: { game: string }) {
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const g = BY_GAME[game];
  if (!g) return null;
  return (
    <div className="practice">
      <div className="guidehead"><span>PRUÉBALO ANTES · NO PUNTÚA</span>{done && <span className="pok">✔ YA SABES JUGAR</span>}</div>
      <div key={run}>{g.body({ onDone: () => setDone(true) })}</div>
      {done && <>
        <p className="pafter">{g.after}</p>
        <p><button className="btn ghost" onClick={() => { setRun(run + 1); setDone(false); }}>REPETIR PRÁCTICA</button></p>
      </>}
    </div>
  );
}
