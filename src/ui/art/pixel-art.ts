/**
 * Agent Quest pixel-art library.
 * Every sprite is a grid of characters; every character is a palette key.
 * This file imports nothing (it can be run with node to generate contact sheets).
 */
export type Pal = Record<string, string>;
export type Art = string[];

/* ---------- utilidades ---------- */
type G = string[][];
export const grid = (w: number, h: number, c = "."): G => Array.from({ length: h }, () => Array(w).fill(c));
export const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < g[0].length) g[j][i] = c;
};
export const px = (g: G, x: number, y: number, c: string) => rect(g, x, y, 1, 1, c);
export const frame = (g: G, x: number, y: number, w: number, h: number, edge: string, fill: string) => {
  rect(g, x, y, w, h, edge);
  rect(g, x + 1, y + 1, w - 2, h - 2, fill);
};
export const out = (g: G): Art => g.map((r) => r.join(""));
export const toGrid = (a: Art): G => a.map((r) => [...r]);
/** Stamps `src` onto `dst` ("." in src is transparent; " " erases). */
export const stamp = (dst: G, src: Art, x: number, y: number) => {
  src.forEach((row, j) => [...row].forEach((ch, i) => {
    if (ch === "." || !dst[y + j] || x + i < 0 || x + i >= dst[0].length) return;
    dst[y + j][x + i] = ch === " " ? "." : ch;
  }));
};
/** Adds a 1 px outline (key `k`) around the drawing, growing the canvas 1 px per side. */
export function outline(a: Art, k = "k"): Art {
  const h = a.length, w = a[0].length;
  const g = grid(w + 2, h + 2);
  const on = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && a[y][x] !== ".";
  for (let y = -1; y <= h; y++) for (let x = -1; x <= w; x++) {
    if (on(x, y)) g[y + 1][x + 1] = a[y][x];
    else if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) g[y + 1][x + 1] = k;
  }
  return out(g);
}
/** Edge lighting: `base` pixels with nothing above become `hi`, and with nothing below become `lo`. Gives volume to flat sprites. */
export function shade(a: Art, base: string, hi: string, lo?: string): Art {
  const at = (x: number, y: number) => (a[y]?.[x] ?? ".");
  return a.map((row, y) => [...row].map((ch, x) => {
    if (ch !== base) return ch;
    if (at(x, y - 1) === ".") return hi;
    if (lo && at(x, y + 1) === ".") return lo;
    return ch;
  }).join(""));
}
export const flipX = (a: Art): Art => a.map((r) => [...r].reverse().join(""));

const hex = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Mixes two #rrggbb colours (t = 0 → a, t = 1 → b). */
export function mix(a: string, b: string, t: number) {
  const [x, y] = [hex(a), hex(b)];
  return "#" + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, "0")).join("");
}

function svg(frames: Art[], pal: Pal) {
  const h = frames[0].length, w = frames[0][0].length;
  let rects = "";
  frames.forEach((art, f) => art.forEach((row, y) => {
    // merges adjacent pixels of the same colour into one rect (much smaller SVG)
    let x = 0;
    while (x < row.length) {
      const fill = pal[row[x]];
      let n = 1;
      while (x + n < row.length && row[x + n] === row[x]) n++;
      if (fill) rects += `<rect x='${f * w + x}' y='${y}' width='${n}' height='1' fill='${fill}'/>`;
      x += n;
    }
  }));
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w * frames.length} ${h}' shape-rendering='crispEdges'>${rects}</svg>`;
}
const dataUrl = (s: string) => `url("data:image/svg+xml,${encodeURIComponent(s)}")`;
/** Sprite → `url(...)` to use as a background. */
export const spriteUrl = (art: Art, pal: Pal) => dataUrl(svg([art], pal));
/** Several frames side by side (animation sheet). Use it with the `.a2` / `.a4` classes. */
export const sheetUrl = (frames: Art[], pal: Pal) => dataUrl(svg(frames, pal));
export const svgText = (frames: Art[], pal: Pal) => svg(frames, pal);

/* ---------- paleta base ---------- */
export const P: Pal = {
  k: "#0a0c16", w: "#f4f1de", s: "#c2bda4", y: "#ffd84a", Y: "#b8860b", r: "#ff4f6a", R: "#a8243c",
  o: "#ff9a3c", c: "#4fffd0", C: "#1fa98a", b: "#4fc3ff", B: "#1f6fa8", d: "#0b1030", D: "#05070f",
  g: "#b8c0e8", G: "#6b76ad", h: "#e6eaff", m: "#5a6cc4", M: "#2b3470", n: "#3ddc84", N: "#1e9a58",
  p: "#ff4f9a", v: "#b86bff", V: "#6f3bb0", t: "#8a5a2b", T: "#5c3a18", l: "#d9a441", e: "#ffffff",
};

/* ---------- robots (avatares) ---------- */
/**
 * Robot based on the Sirviendo Código mascot: dome head with an antenna, one big eye and one small eye,
 * a body made of linked nodes (shoulder, core, hand and wheel) and a raised arm holding the tray.
 */
const ROBOT_BASE: Art = [
  "................",
  "................",
  ".c.....kkkkk....",
  "ccc..kkhhhhhkk..",
  "www.kghggggggGk.",
  ".G.kgggggggggGGk",
  ".G.kggggggggggGk",
  ".G.kggggggggggGk",
  ".G.kGGGGGGGGGGGk",
  "kgk.kkkkkkkkkkk.",
  "kgGGkghcchgkGggk",
  ".kk.kgGccGGk.kk.",
  ".....kkGGkk.....",
  "......kggGk.....",
  "......kgGGk.....",
  "......kkkkk.....",
];
/** Wheel (rows 13-15): it sways from side to side when walking. */
const LEGS: Record<string, Art> = {
  idle: ["......kggGk.....", "......kgGGk.....", "......kkkkk....."],
  a: [".....kggGk......", ".....kgGGk......", ".....kkkkk......"],
  b: [".......kggGk....", ".......kgGGk....", ".......kkkkk...."],
};
/** Eyes: 8×3 on the dome (rows 5-7, columns 6-13). `d` is the dark socket and `c` the glint. */
const EYES: Art[] = [
  ["..ddd...", "..dcd.dc", "..ddd.dd"], // the Sirviendo Código look: one big, one small
  ["........", ".d....d.", "d.d..d.d"], // happy
  ["..dddd..", "..dccd..", "..dddd.."], // cyclops
  ["dddddddd", "dcwccccd", "dddddddd"], // visor
  ["ddd..ddd", "dcd..dcd", "ddd..ddd"], // two big eyes
  ["d.......", ".d......", "d..ddd.."], // terminal >_
  ["..ddd...", "..dcd.dc", "..ddd.dd"], // gala: same as the logo
  ["d.d..d.d", ".d....d.", "d.d..d.d"], // crosses
];
const BLINK: Art = ["........", "..ddd.dd", "........"];
/** Head accessories (rows 0-2): most are variations of the ball antenna. */
const TOPS: Art[] = [
  ["..........cc....", ".........G......"], // tilted antenna, like the logo
  ["......c.....c...", ".......G...G...."], // two antennas
  [".........cc.....", ".........GG....."], // straight antenna
  [".......kkkkkk...", ".....kkrrrrrrkk."], // cap
  [".......cc.......", ".........G......"], // antenna tilted the other way
  ["........c..c....", ".........GG....."], // V antenna
  [".......mMMMM....", ".......rrrrr....", ".....MMMMMMMMM.."], // top hat
  ["..........c.....", ".........G......"], // short antenna
];
/** Tuxedo over the core: lapels, shirt and bow tie. */
const TUX: Art = ["kMwrrwMk", "kMmwwMMk"];
export const AVATARS: { name: string; g: string; G: string; eyes: number; top: number; c?: string; tux?: boolean }[] = [
  { name: "Bolt", g: "#6fc0ab", G: "#3e9fc6", eyes: 0, top: 0, c: "#e9fff8" },
  { name: "Rosa", g: "#ff9ab8", G: "#c2456e", eyes: 1, top: 1, c: "#fff0a8" },
  { name: "Lima", g: "#c4e86b", G: "#6f9c2e", eyes: 2, top: 2, c: "#ffd84a" },
  { name: "Capi", g: "#ffd84a", G: "#b08a14", eyes: 3, top: 3, c: "#ff4f6a" },
  { name: "Helix", g: "#7fb4ff", G: "#3a5fc2", eyes: 4, top: 4, c: "#4fffd0" },
  { name: "Shell", g: "#ffa66b", G: "#b5541a", eyes: 5, top: 5, c: "#3ddc84" },
  { name: "Gala", g: "#ffffff", G: "#b4bbd4", eyes: 6, top: 6, c: "#ffd84a", tux: true },
  { name: "Glitch", g: "#f4f1de", G: "#8f8a74", eyes: 7, top: 7, c: "#ff4f9a" },
];
export type RobotFrame = "idle" | "blink" | "a" | "b" | "breath";
export function robotArt(n: number, f: RobotFrame = "idle"): Art {
  const av = AVATARS[n] ?? AVATARS[0];
  const g = toGrid(ROBOT_BASE);
  stamp(g, TOPS[av.top], 0, 0);
  stamp(g, f === "blink" ? BLINK : EYES[av.eyes], 6, 5);
  if (av.tux) stamp(g, TUX, 4, 10);
  rect(g, 0, 13, 16, 3, ".");
  const legs = LEGS[f === "a" || f === "b" ? f : "idle"];
  // Gala's wheel is a patent-leather shoe: black with a golden shine
  stamp(g, av.tux ? legs.map((r) => r.replace(/G/g, "M").replace(/g/g, "m").replace("mm", "ym")) : legs, 0, 13);
  if (f === "breath") { const a = out(g); return [".".repeat(16), ...a.slice(0, 12), ...a.slice(13)]; } // the body drops 1 px
  return out(g);
}
export function robotPal(n: number): Pal {
  const av = AVATARS[n] ?? AVATARS[0];
  // Gala wears a tuxedo: black (lightened so it reads on the dark background), white and golden touches
  const tux: Pal = av.tux ? { M: "#3a3e52", m: "#6d7390", r: "#ffd84a" } : {};
  return { ...P, g: av.g, G: av.G, h: mix(av.g, "#ffffff", 0.55), c: av.c ?? P.c, d: "#0b1030", ...tux };
}
export const robotUrl = (n: number, f: RobotFrame = "idle") => spriteUrl(robotArt(n, f), robotPal(n));
/** 4-frame sheet: idle with a blink. */
export const robotIdleSheet = (n: number) => sheetUrl([robotArt(n), robotArt(n, "breath"), robotArt(n), robotArt(n, "blink")], robotPal(n));
/** 2-frame sheet: walking. */
export const robotWalkSheet = (n: number) => sheetUrl([robotArt(n, "a"), robotArt(n, "b")], robotPal(n));

/* ---------- objetos ---------- */
const ROCKET_BODY: Art = [
  ".......kk.......",
  "......kwwk......",
  ".....kwwwsk.....",
  ".....kwwwsk.....",
  "....kwwbbwsk....",
  "....kwbBBbsk....",
  "....kwbBBbsk....",
  "....kwwbbwsk....",
  "...kkwwwwwskk...",
  "..krkwwwwwskrk..",
  ".krrkwwwwwskrrk.",
  ".krRkkwwwskkRrk.",
  ".kkk.kkkkkk.kkk.",
];
export const ROCKET: Art = [...ROCKET_BODY, "......oyyo......", "......oyyo......", ".......oo......."];
export const ROCKET_B: Art = [...ROCKET_BODY, "......yooy......", ".......yy.......", "................"];
export const ROCKET_FIRE: Art = [...ROCKET_BODY, ".....oyyyyo.....", ".....oyeeyo.....", "......oyyo......"];

export const HAZFILE: Art = [
  "..kkkkkkkkk.....",
  "..kwwwwwwwkk....",
  "..kwwwwwwwksk...",
  "..kwwwwwwwkkkk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwwwwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwrrwwwsk..",
  "..kwwwwwwwwwsk..",
  "..kyDyDyDyDysk..",
  "..kkkkkkkkkkkk..",
  "................",
];
export const BROKEN: Art = [
  "................",
  "..kkkk...kkk....",
  "..kwwk..kwwkk...",
  "..kwwwk.kwwsk...",
  "..kwwwkkkwwwsk..",
  "..kwwkk.kkwwsk..",
  "..kwk.....kwsk..",
  "..kk..o.o..ksk..",
  "......oyo...kk..",
  "..kk.oyyyo......",
  "..kwkkoyokkwk...",
  "..kwwwkokwwsk...",
  "..kwwwwkwwwsk...",
  "..kDDDDDDDDsk...",
  "..kkkkkkkkkkk...",
  "................",
];
export const BOOM_A: Art = [
  "................",
  "....y......y....",
  ".....y.oo.y.....",
  "..y...orro...y..",
  "...y.orryro.y...",
  "....orryyrro....",
  "..oorryyeyrroo..",
  "..orryyeeeyrro..",
  "..orryyeeeyrro..",
  "..oorryyeyrroo..",
  "....orryyrro....",
  "...y.orryro.y...",
  "..y...orro...y..",
  ".....y.oo.y.....",
  "....y......y....",
  "................",
];
export const BOOM_B: Art = [
  "..y....o.....y..",
  "......oo...o....",
  ".o...orro..oo...",
  "..o.orryro......",
  "...orryyyrro..o.",
  "..orryyeeyyrro..",
  ".orryyeeeeyyrro.",
  "oorryeeeeeeyrroo",
  ".orryeeeeeeyrro.",
  ".orryyeeeeyyrro.",
  "..orryyeeyyrro..",
  "...orryyyyrro...",
  ".o..orryyrro..o.",
  "..o..orrrro..o..",
  "......oooo......",
  "..y..........y..",
];
export const HEART: Art = outline([".rr...rr.", "rerr.rrrr", "rerrrrrrr", "rrrrrrrrR", ".rrrrrrR.", "..rrrrR..", "...rrR...", "....R...."]);

/** Icons of the context items (level 3). */
export const ITEM_ART: Record<string, Art> = {
  file: [
    "..kkkkkkkk......",
    "..kwwwwwwkk.....",
    "..kwwwwwwksk....",
    "..kwwwwwwkkkk...",
    "..kwwwwwwwwsk...",
    "..kwwbwwwbwsk...",
    "..kwbwwwwwbsk...",
    "..kbwwwwwwwbk...",
    "..kwbwwwwwbsk...",
    "..kwwbwwwbwsk...",
    "..kwwwwwwwwsk...",
    "..kwbbbbbbwsk...",
    "..kwwwwwwwwsk...",
    "..kkkkkkkkkkk...",
    "................",
    "................",
  ],
  log: [
    "................",
    ".kkkkkkkkkkkkk..",
    ".kooooooooooook.",
    ".kkkkkkkkkkkkkk.",
    "..kwwwwwwwwwsk..",
    "..kwDDDDDwwwsk..",
    "..kwwwwwwwwwsk..",
    "..kwDDDDDDDwsk..",
    "..kwwwwwwwwwsk..",
    "..kwrrrDDwwwsk..",
    "..kwwwwwwwwwsk..",
    "..kwDDDDDDwwsk..",
    ".kkkkkkkkkkkkkk.",
    ".kooooooooooook.",
    ".kkkkkkkkkkkkk..",
    "................",
  ],
  doc: [
    "................",
    "..kkkkkkkkkkkk..",
    ".knnnnnnnnnnnNk.",
    ".knwwwwwwwwwnNk.",
    ".knwkwwwkwwwnNk.",
    ".knwkkwkkwwwnNk.",
    ".knwkwkwkwwwnNk.",
    ".knwkwwwkwwwnNk.",
    ".knwkwwwkwwwnNk.",
    ".knwwwwwwwwwnNk.",
    ".knwNNNNNNNwnNk.",
    ".knwwwwwwwwwnNk.",
    ".knnnnnnnnnnnNk.",
    ".kNNNNNNNNNNNNk.",
    "..kkkkkkkkkkkk..",
    "................",
  ],
  chat: [
    "................",
    ".kkkkkkkkkk.....",
    "kvvvvvvvvvvk....",
    "kvwwvwwvwwvk....",
    "kvvvvvvvvvvk....",
    "kvvvvvvvvvvk....",
    ".kkvvkkkkkk.....",
    "..kvk.kkkkkkkkk.",
    "..kk.kwwwwwwwwwk",
    ".....kwVVwVVVVwk",
    ".....kwwwwwwwwwk",
    ".....kwVVVVwVVwk",
    ".....kwwwwwwwwwk",
    "......kkkkkwwkk.",
    "..........kwk...",
    "..........kk....",
  ],
};
export const ITEM_PAL: Pal = { ...P };

/* ---------- enemies (level 4): three shapes, two frames ---------- */
const BUG_SHAPES: [Art, Art][] = [
  [
    ["..b.....b..", "...b...b...", "..bbbbbbb..", ".bbebbbebb.", "bbbbbbbbbbb", "b.BBBBBBB.b", "b.B.....B.b", "...BB.BB..."],
    ["..b.....b..", "b..b...b..b", "b.bbbbbbb.b", "bbbebbbebbb", "bbbbbbbbbbb", ".BBBBBBBBB.", "..B.....B..", ".B.......B."],
  ],
  [
    ["....bb.....", "...bbbb....", "..bbbbbb...", ".bbebbebb..", ".bbbbbbbb..", "...B..B....", "..B.BB.B...", ".B.B..B.B.."],
    ["....bb.....", "...bbbb....", "..bbbbbb...", ".bbebbebb..", ".bbbbbbbb..", "..B.BB.B...", ".B......B..", "..B....B..."],
  ],
  [
    ["...bbbbb...", ".bbbbbbbbb.", "bbbbbbbbbbb", "bbeebbbeebb", "bbbbbbbbbbb", "..BBB.BBB..", ".BB..B..BB.", "BB.......BB"],
    ["...bbbbb...", ".bbbbbbbbb.", "bbbbbbbbbbb", "bbeebbbeebb", "bbbbbbbbbbb", "..BBB.BBB..", ".BB.BBB.BB.", "..BB...BB.."],
  ],
];
export const bugFrames = (shape: number): Art[] => BUG_SHAPES[shape % 3].map((a) => outline(shade(a, "b", "h")));
export const bugPal = (color: string): Pal => ({ k: P.k, b: color, B: mix(color, "#000000", 0.38), h: mix(color, "#ffffff", 0.5), e: "#ffffff" });
export const bugSheet = (shape: number, color: string) => sheetUrl(bugFrames(shape), bugPal(color));
export const bugUrl = (shape: number, color: string) => spriteUrl(bugFrames(shape)[0], bugPal(color));

/* ---------- level 1 tiles (server room) ---------- */
function floorTile(v: number): Art {
  const g = grid(16, 16, "f");
  rect(g, 0, 0, 16, 1, "F"); rect(g, 0, 0, 1, 16, "F");
  rect(g, 1, 1, 15, 1, "i"); rect(g, 1, 1, 1, 15, "i");
  [[3, 3], [13, 3], [3, 13], [13, 13]].forEach(([x, y]) => px(g, x, y, "F"));
  if (v === 1) { rect(g, 6, 6, 5, 1, "F"); rect(g, 6, 8, 5, 1, "F"); rect(g, 6, 10, 5, 1, "F"); } // grille
  if (v === 2) { px(g, 8, 5, "F"); px(g, 9, 6, "F"); px(g, 9, 7, "F"); px(g, 10, 8, "F"); px(g, 6, 11, "i"); } // crack
  if (v === 3) { rect(g, 5, 5, 7, 7, "F"); rect(g, 6, 6, 5, 5, "f"); px(g, 8, 8, "i"); } // plate
  return out(g);
}
function wallTop(): Art {
  const g = grid(16, 16, "t");
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if ((x + y) % 8 === 0) g[y][x] = "u";
  return out(g);
}
/** Front face of a wall: 4 px of top edge + 12 px of front. */
function wallFace(kind: "panel" | "rack" | "rackB" | "term" | "termB" | "pipe"): Art {
  const g = grid(16, 16, "a");
  rect(g, 0, 0, 16, 4, "t"); rect(g, 0, 3, 16, 1, "u"); // edge
  rect(g, 0, 4, 16, 1, "A"); rect(g, 0, 15, 16, 1, "k"); rect(g, 0, 14, 16, 1, "A");
  if (kind === "panel") { rect(g, 0, 5, 1, 9, "A"); rect(g, 8, 5, 1, 9, "A"); px(g, 2, 6, "x"); px(g, 6, 6, "x"); px(g, 10, 6, "x"); px(g, 14, 6, "x"); px(g, 2, 12, "A"); px(g, 14, 12, "A"); }
  if (kind === "pipe") { rect(g, 0, 7, 16, 3, "x"); rect(g, 0, 7, 16, 1, "X"); rect(g, 0, 9, 16, 1, "A"); rect(g, 5, 6, 2, 5, "X"); rect(g, 5, 6, 1, 5, "x"); rect(g, 11, 12, 3, 1, "A"); }
  if (kind === "rack" || kind === "rackB") {
    frame(g, 2, 5, 12, 9, "k", "D");
    for (let i = 0; i < 3; i++) {
      rect(g, 3, 6 + i * 3, 10, 2, "A"); rect(g, 3, 6 + i * 3, 10, 1, "x");
      const on = kind === "rack" ? i !== 1 : i === 1;
      px(g, 4, 7 + i * 3, on ? "n" : "N"); px(g, 6, 7 + i * 3, i === 2 ? "o" : on ? "N" : "n"); rect(g, 9, 7 + i * 3, 3, 1, "k");
    }
  }
  if (kind === "term" || kind === "termB") {
    frame(g, 3, 5, 10, 8, "k", "D");
    rect(g, 4, 6, 4, 1, "c"); rect(g, 4, 8, 6, 1, "C"); rect(g, 4, 10, kind === "term" ? 3 : 5, 1, "c");
    if (kind === "term") px(g, 8, 10, "w");
    rect(g, 6, 13, 4, 1, "k");
  }
  return out(g);
}
function fogTile(): Art {
  const g = grid(16, 16, "q");
  [[2, 3], [9, 1], [13, 6], [5, 9], [11, 12], [1, 13], [7, 14]].forEach(([x, y]) => px(g, x, y, "Q"));
  return out(g);
}
export const TILE_PAL: Pal = {
  ...P, f: "#2b3674", F: "#1f2859", i: "#36448c", t: "#3b4a90", u: "#4556a2", a: "#202960", A: "#151b44", x: "#34408a", X: "#5568bd",
  q: "#060814", Q: "#0d1128",
};
export const TILES = {
  floor: [0, 1, 2, 3].map(floorTile),
  top: wallTop(),
  panel: wallFace("panel"), pipe: wallFace("pipe"),
  rack: [wallFace("rack"), wallFace("rackB")], term: [wallFace("term"), wallFace("termB")],
  fog: fogTile(),
};

/* ---------- world map buildings and scenes ---------- */
/** 32×12 floating island every building stands on. */
export function island(): Art {
  const g = grid(32, 12);
  rect(g, 1, 0, 30, 1, "k"); rect(g, 0, 1, 32, 4, "k"); rect(g, 1, 1, 30, 3, "t"); rect(g, 1, 1, 30, 1, "u");
  for (let j = 0; j < 7; j++) { const x = 1 + j * 2, w = 30 - j * 4; if (w <= 0) break; rect(g, x, 5 + j, w, 1, "k"); if (w > 2) rect(g, x + 1, 5 + j, w - 2, 1, j % 2 ? "A" : "a"); }
  [[5, 6], [12, 7], [20, 6], [25, 5], [15, 9]].forEach(([x, y]) => px(g, x, y, "x"));
  [[4, 4], [10, 4], [16, 4], [22, 4], [28, 4]].forEach(([x, y]) => px(g, x, y, "c")); // edge lights
  rect(g, 14, 11, 4, 1, "o"); // thruster
  return out(g);
}
export const BUILDINGS: Art[] = [
  // 1 · vault
  [
    "..kkkkkkkkkkkk..",
    ".kggggggggggggk.",
    ".kgkkkkkkkkkkgk.",
    ".kgkGGGGGGGGkgk.",
    ".kgkGGkkkkGGkgk.",
    ".kgkGkyyyykGkgk.",
    ".kgkGkykkykGkgk.",
    ".kgkGkyyyykGkgk.",
    ".kgkGGkyykGGkgk.",
    ".kgkGGkyykGGkgk.",
    ".kgkGGGkkGGGkgk.",
    ".kgkGGGGGGGGkgk.",
    ".kgkkkkkkkkkkgk.",
    ".kggggggggggggk.",
    ".kGGGGGGGGGGGGk.",
    ".kkkkkkkkkkkkkk.",
  ],
  // 2 · robot workshop (monitor with a prompt)
  [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kggggggggggggk.",
    ".kgDDDDDDDDDDgk.",
    ".kgDcDDDDDDDDgk.",
    ".kgDDcDDDDDDDgk.",
    ".kgDcDDcccDDDgk.",
    ".kgDDDDDDDDDDgk.",
    ".kgDnnnnnDDDDgk.",
    ".kgDDDDDDDDDDgk.",
    ".kggggggggggggk.",
    ".kkkkkkGGkkkkkk.",
    "......kGGk......",
    "...kkkkGGkkkk...",
    "...kGGGGGGGGk...",
    "...kkkkkkkkkk...",
  ],
  // 3 · backpack
  [
    ".....kkkkkk.....",
    "....kk....kk....",
    "...kkkkkkkkkk...",
    "..kooooooooook..",
    ".kooooooooooook.",
    ".koOOOOOOOOOOok.",
    ".kooooooooooook.",
    ".kokkkkkkkkkkok.",
    ".kokllllllllkok.",
    ".koklkkkkkklkok.",
    ".kokllllllllkok.",
    ".kokkkkkkkkkkok.",
    ".kooooooooooook.",
    ".kOOOOOOOOOOOOk.",
    "..kkkkkkkkkkkk..",
    "................",
  ],
  // 4 · tower
  [
    ".kkk.kkkk.kkk...",
    ".kgk.kggk.kgk...",
    ".kgkkkggkkkgk...",
    ".kggggggggggk...",
    ".kGGGGGGGGGGk...",
    "..kggggggggk....",
    "..kggkkkkggk....",
    "..kggkyykggk....",
    "..kggkyykggk....",
    "..kggkkkkggk....",
    "..kggggggggk....",
    "..kgGggggGgk....",
    "..kggggggggk....",
    ".kggggggggggk...",
    ".kGGGGGGGGGGk...",
    ".kkkkkkkkkkkk...",
  ],
  // 5 · factory with a lever
  [
    "...........kkk..",
    "..kk.......kgk..",
    ".kwwk......kgk..",
    "..kk.kk....kgk..",
    "....kwwk...kgk..",
    ".....kk....kgk..",
    ".kkkkkkkkkkkgk..",
    ".kgggggggggggk..",
    ".kgkkkgkkkgkkkk.",
    ".kgkbkgkbkgkyyk.",
    ".kgkkkgkkkgkkkk.",
    ".kgggggggggggGk.",
    ".kgggkkkkggggGk.",
    ".kgggkDDkggggGk.",
    ".kGGGkDDkGGGGGk.",
    ".kkkkkkkkkkkkkk.",
  ],
  // 6 · agent hub (three connected screens)
  [
    "................",
    "......kkkk......",
    ".....kcccck.....",
    ".....kcDDck.....",
    ".....kcccck.....",
    "......kkkk......",
    ".......kk.......",
    "..kkkkkkkkkkkk..",
    "..k..........k..",
    ".kkkk......kkkk.",
    "kbbbbk....knnnnk",
    "kbDDbk....knDDnk",
    "kbbbbk....knnnnk",
    ".kkkk......kkkk.",
    ".kGGk......kGGk.",
    ".kkkk......kkkk.",
  ],
  // 7 · boss tower
  [
    ".k.k..k.k..k.k..",
    ".kkk..kkk..kkk..",
    ".kGkkkkGkkkkGk..",
    ".kGGGGGGGGGGGk..",
    ".kGrrGGGGGrrGk..",
    ".kGrrGGGGGrrGk..",
    ".kGGGGGGGGGGGk..",
    ".kGGGkkkkkGGGk..",
    ".kGGkDDDDDkGGk..",
    ".kGGkDrDrDkGGk..",
    ".kGGkDDDDDkGGk..",
    ".kGGkDkDkDkGGk..",
    ".kGGkkkkkkkGGk..",
    ".kGGGGGGGGGGGk..",
    ".kGGGGGGGGGGGk..",
    ".kkkkkkkkkkkkk..",
  ],
];
export const BUILD_PAL: Pal = { ...P, O: "#b5541a", t: "#42529c", u: "#7f93e6", a: "#27306a", A: "#1a2150", x: "#3a4688" };

/** Person (the client of level 2). */
export const CLIENT: Art = [
  "................",
  ".....kkkkkk.....",
  "....kTTTTTTk....",
  "...kTTTTTTTTk...",
  "...kTllllllTk...",
  "...kllkllkllk...",
  "...kllllllllk...",
  "....kllrrllk....",
  ".....kllllk.....",
  "...kkkbbbbkkk...",
  "..kbbbbwwbbbbk..",
  "..kbkbbwwbbkbk..",
  "..klkbbbbbbklk..",
  "..kkkBBBBBBkkk..",
  "....kBBkkBBk....",
  "....kkkk.kkkk...",
];
/** Workbench with a monitor (level 2), 24×16. */
export function workbench(lit: boolean): Art {
  const g = grid(24, 16);
  frame(g, 4, 0, 16, 10, "k", "g"); rect(g, 5, 1, 14, 1, "h"); frame(g, 6, 2, 12, 6, "k", "D");
  if (lit) { rect(g, 7, 3, 5, 1, "c"); rect(g, 7, 4, 8, 1, "n"); rect(g, 7, 6, 3, 1, "c"); px(g, 11, 6, "w"); }
  rect(g, 10, 10, 4, 2, "k"); rect(g, 11, 10, 2, 2, "G");
  frame(g, 0, 12, 24, 4, "k", "t"); rect(g, 1, 13, 22, 1, "l");
  return out(g);
}
/** Defence tower (level 4), 16×24: `lit` turns the cannon on. */
export function tower(lit: boolean): Art {
  const g = grid(16, 24);
  rect(g, 2, 2, 12, 5, "k"); rect(g, 3, 3, 10, 3, "g"); rect(g, 3, 3, 10, 1, "h");
  [2, 6, 10].forEach((x) => { rect(g, x, 0, 4, 3, "k"); rect(g, x + 1, 1, 2, 2, "g"); });
  rect(g, 3, 7, 10, 15, "k"); rect(g, 4, 7, 8, 14, "g"); rect(g, 10, 7, 2, 14, "G");
  frame(g, 6, 10, 4, 5, "k", lit ? "y" : "D"); if (lit) px(g, 7, 11, "e");
  [[5, 17], [8, 19], [5, 20]].forEach(([x, y]) => px(g, x, y, "G"));
  rect(g, 1, 21, 14, 3, "k"); rect(g, 2, 22, 12, 1, "G");
  return out(g);
}
/** Repository server to protect (level 4), 16×24. */
export function repoCore(hit: boolean): Art {
  const g = grid(16, 24);
  frame(g, 1, 1, 14, 22, "k", "g"); rect(g, 12, 2, 2, 20, "G"); rect(g, 2, 2, 10, 1, "h");
  for (let i = 0; i < 4; i++) {
    frame(g, 3, 4 + i * 4, 9, 3, "k", "D");
    px(g, 4, 5 + i * 4, hit ? "r" : "n"); px(g, 6, 5 + i * 4, hit ? "r" : i % 2 ? "y" : "n"); rect(g, 8, 5 + i * 4, 3, 1, hit ? "R" : "M");
  }
  rect(g, 0, 22, 16, 2, "k"); rect(g, 1, 22, 14, 1, "G");
  return out(g);
}

/* ---------- final boss (level 7): two frames ---------- */
const BOSS_A: Art = [
  "..v..........v..",
  "..vv........vv..",
  "...vvvvvvvvvv...",
  "..vvvvvvvvvvvv..",
  ".vvrrvvvvvvrrvv.",
  ".vvrevvvvvvrevv.",
  ".vvvvvvvvvvvvvv.",
  "vvvvkkvkkvkkvvvv",
  "vvvvkwkwwkwkvvvv",
  "vvvvvkkkkkkvvvvv",
  ".VVVVVVVVVVVVVV.",
  ".VV.VVVVVVVV.VV.",
  "VV...VV..VV...VV",
  "V....V....V....V",
];
const BOSS_B: Art = [
  "v..............v",
  ".vv..........vv.",
  "...vvvvvvvvvv...",
  "..vvvvvvvvvvvv..",
  ".vvrrvvvvvvrrvv.",
  ".vvervvvvvvervv.",
  ".vvvvvvvvvvvvvv.",
  "vvvvkkvkkvkkvvvv",
  "vvvvkwkwwkwkvvvv",
  "vvvvvkkkkkkvvvvv",
  ".VVVVVVVVVVVVVV.",
  "VVV.VVVVVVVV.VVV",
  ".V...VV..VV...V.",
  ".....V....V.....",
];
export const bossSheet = () => sheetUrl([BOSS_A, BOSS_B].map((a) => outline(shade(a, "v", "L"))), { ...P, L: mix(P.v, "#ffffff", 0.45) });
