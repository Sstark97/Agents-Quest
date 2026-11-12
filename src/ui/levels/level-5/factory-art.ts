import type { CSSProperties } from "react";
import type { Tool } from "@/src/domain/levels/level-5/tool-cards";
import { spriteUrl } from "@/src/ui/art/sprites";

type G = string[][];
const grid = (w: number, h: number): G => Array.from({ length: h }, () => Array(w).fill("."));
const rect = (g: G, x: number, y: number, w: number, h: number, c: string) => {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) if (g[j] && i >= 0 && i < g[0].length) g[j][i] = c;
};
const px = (g: G, x: number, y: number, c: string) => rect(g, x, y, 1, 1, c);
const frame = (g: G, x: number, y: number, w: number, h: number, edge: string, fill: string) => {
  rect(g, x, y, w, h, edge);
  rect(g, x + 1, y + 1, w - 2, h - 2, fill);
};
const out = (g: G) => g.map((r) => r.join(""));
const transpose = (a: string[]) => [...a[0]].map((_, x) => a.map((r) => r[x]).join(""));

const ACCENT: Record<Tool, [string, string]> = {
  editor: ["#4fc3ff", "#1f7fb5"],
  ide: ["#3ddc84", "#1e9a58"],
  cli: ["#ff4f9a", "#b02a6a"],
};
const BASE = { k: "#0a0c16", s: "#59627f", S: "#2b3150", h: "#8b93c9", d: "#05070f", g: "#3ddc84", r: "#ff4f6a", m: "#5a6cc4", w: "#f4f1de", y: "#ffd84a" };

function machine(t: Tool) {
  const g = grid(32, 22);
  frame(g, 24, 1, 5, 4, "k", "S"); rect(g, 23, 0, 7, 2, "k"); rect(g, 24, 0, 5, 1, "h"); // chimney
  frame(g, 0, 4, 32, 18, "k", "s");
  rect(g, 1, 5, 30, 1, "h"); rect(g, 1, 20, 30, 1, "S");
  [[2, 6], [29, 6], [2, 19], [29, 19]].forEach(([x, y]) => px(g, x, y, "S"));
  rect(g, 3, 7, 22, 3, "c"); rect(g, 3, 10, 22, 1, "C"); // name plate
  rect(g, 0, 12, 3, 5, "d"); rect(g, 0, 11, 3, 1, "k"); rect(g, 0, 17, 3, 1, "k"); // intake
  frame(g, 3, 12, 14, 8, "k", "d"); // screen
  if (t === "editor") { rect(g, 5, 14, 9, 1, "c"); rect(g, 5, 16, 6, 1, "m"); rect(g, 12, 16, 1, 2, "w"); rect(g, 5, 18, 8, 1, "m"); }
  if (t === "ide") { rect(g, 5, 14, 7, 1, "g"); rect(g, 5, 15, 5, 1, "r"); rect(g, 5, 16, 9, 1, "g"); rect(g, 5, 17, 4, 1, "m"); rect(g, 5, 18, 8, 1, "g"); }
  if (t === "cli") { px(g, 5, 14, "g"); px(g, 6, 15, "g"); px(g, 5, 16, "g"); rect(g, 8, 16, 3, 1, "g"); rect(g, 5, 18, 7, 1, "m"); }
  frame(g, 19, 12, 11, 8, "k", "d"); // results board
  rect(g, 4, 21, 5, 1, "k"); rect(g, 22, 21, 5, 1, "k");
  return spriteUrl(out(g), { ...BASE, c: ACCENT[t][0], C: ACCENT[t][1] });
}

function belt(surface: string, gap: string, top: string, vertical: boolean) {
  const g = grid(8, 8);
  rect(g, 0, 0, 8, 1, "k"); rect(g, 0, 7, 8, 1, "k");
  rect(g, 0, 1, 8, 1, "t"); rect(g, 0, 6, 8, 1, "S");
  for (let x = 0; x < 8; x++) rect(g, x, 2, 1, 4, x % 4 === 0 ? "d" : "b");
  const art = out(g);
  return spriteUrl(vertical ? transpose(art) : art, { k: "#0a0c16", t: top, S: "#2b3150", b: surface, d: gap });
}

function corner(color: string) {
  const g = grid(8, 8);
  frame(g, 0, 0, 8, 8, "k", "s"); rect(g, 1, 1, 6, 1, "h"); rect(g, 3, 3, 2, 2, "c"); px(g, 1, 6, "S");
  return spriteUrl(out(g), { ...BASE, c: color });
}

function crate(c: string, C: string) {
  const art = ["kkkkkkkk", "kXccccXk", "kcXccXck", "kccXXcck", "kccXXcck", "kcXccXck", "kXccccXk", "kkkkkkkk"];
  return spriteUrl(art, { k: "#0a0c16", c, X: C });
}

function gearArt() {
  const g = grid(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const dx = x - 7.5, dy = y - 7.5, d = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    const tooth = Math.floor(((a + Math.PI) / (Math.PI * 2)) * 16) % 2 === 0;
    if (d <= 2.2) g[y][x] = "d";
    else if (d <= 5.6) g[y][x] = d > 4.6 ? "h" : "s";
    else if (d <= 7.6 && tooth) g[y][x] = "s";
    else if (d <= 7.9 && tooth) g[y][x] = "k";
  }
  return spriteUrl(out(g), BASE);
}

function windowArt() {
  const g = grid(16, 14);
  frame(g, 0, 0, 16, 14, "k", "d"); rect(g, 1, 1, 14, 12, "n");
  rect(g, 7, 1, 2, 12, "k"); rect(g, 1, 6, 14, 2, "k");
  [[3, 3], [11, 2], [4, 10], [12, 11], [2, 5]].forEach(([x, y]) => px(g, x, y, "w"));
  rect(g, 12, 3, 2, 2, "y");
  rect(g, 0, 13, 16, 1, "h");
  return spriteUrl(out(g), { ...BASE, n: "#101a3d" });
}

function pipeArt() {
  const g = grid(16, 6);
  rect(g, 0, 0, 16, 6, "k"); rect(g, 0, 1, 16, 4, "s"); rect(g, 0, 1, 16, 1, "h"); rect(g, 0, 4, 16, 1, "S");
  rect(g, 0, 0, 2, 6, "k"); rect(g, 2, 0, 1, 6, "h"); rect(g, 3, 0, 1, 6, "S"); // flange
  return spriteUrl(out(g), BASE);
}

function plateArt() {
  const g = grid(8, 8);
  rect(g, 0, 0, 8, 8, "s"); rect(g, 0, 0, 8, 1, "h"); rect(g, 0, 7, 8, 1, "S"); rect(g, 7, 0, 1, 8, "S");
  px(g, 1, 2, "S"); px(g, 6, 2, "S"); px(g, 1, 5, "S"); px(g, 6, 5, "S");
  return spriteUrl(out(g), BASE);
}

function hopperArt() {
  const g = grid(14, 16);
  for (let j = 0; j < 9; j++) { rect(g, j, j, 14 - 2 * j, 1, "k"); if (14 - 2 * j > 2) rect(g, j + 1, j, 14 - 2 * j - 2, 1, j % 3 === 0 ? "h" : "s"); }
  rect(g, 5, 9, 4, 6, "k"); rect(g, 6, 9, 2, 6, "S");
  rect(g, 0, 0, 14, 1, "k"); rect(g, 1, 0, 12, 1, "y");
  return spriteUrl(out(g), BASE);
}

function switchArt() {
  const g = grid(12, 12);
  frame(g, 0, 0, 12, 12, "k", "S"); rect(g, 1, 1, 10, 1, "s"); rect(g, 1, 1, 1, 10, "s");
  frame(g, 3, 3, 6, 6, "k", "d"); rect(g, 5, 5, 2, 2, "y");
  [[1, 10], [10, 10], [10, 1]].forEach(([x, y]) => px(g, x, y, "h"));
  return spriteUrl(out(g), BASE);
}

function lampArt() {
  const g = grid(8, 8);
  rect(g, 3, 0, 2, 3, "k"); frame(g, 0, 3, 8, 3, "k", "s"); rect(g, 1, 4, 6, 1, "h"); rect(g, 2, 6, 4, 2, "y"); rect(g, 3, 6, 2, 1, "w");
  return spriteUrl(out(g), BASE);
}

function puffArt() {
  const art = [".wwww.", "wwwwww", "wwwwww", "wwwwww", ".wwww."];
  return spriteUrl(art, { w: "#c9d0ee" });
}

function warnArt() {
  const g = grid(14, 12);
  frame(g, 0, 0, 14, 12, "k", "y");
  rect(g, 6, 2, 2, 5, "k"); rect(g, 6, 8, 2, 2, "k");
  return spriteUrl(out(g), { k: "#0a0c16", y: "#ffd84a" });
}

const BELT_IDLE = { s: "#3a415f", g: "#232842", t: "#59627f" };
const accentBelt = (t: Tool, v: boolean) => belt(ACCENT[t][1], "#05070f", ACCENT[t][0], v);

export const FACTORY_VARS = {
  "--s-machine-editor": machine("editor"),
  "--s-machine-ide": machine("ide"),
  "--s-machine-cli": machine("cli"),
  "--s-bh-idle": belt(BELT_IDLE.s, BELT_IDLE.g, BELT_IDLE.t, false),
  "--s-bv-idle": belt(BELT_IDLE.s, BELT_IDLE.g, BELT_IDLE.t, true),
  "--s-bh-editor": accentBelt("editor", false), "--s-bv-editor": accentBelt("editor", true),
  "--s-bh-ide": accentBelt("ide", false), "--s-bv-ide": accentBelt("ide", true),
  "--s-bh-cli": accentBelt("cli", false), "--s-bv-cli": accentBelt("cli", true),
  "--s-corner-editor": corner(ACCENT.editor[0]), "--s-corner-ide": corner(ACCENT.ide[0]), "--s-corner-cli": corner(ACCENT.cli[0]),
  "--s-crate": crate("#d9a441", "#8a5a14"),
  "--s-crate-ok": crate("#3ddc84", "#1e9a58"),
  "--s-crate-ko": crate("#ff4f6a", "#a02038"),
  "--s-gear": gearArt(), "--s-window": windowArt(), "--s-pipe": pipeArt(), "--s-plate": plateArt(),
  "--s-hopper": hopperArt(), "--s-switch": switchArt(), "--s-lamp": lampArt(), "--s-puff": puffArt(), "--s-warn": warnArt(),
} as unknown as CSSProperties;
