import type * as React from "react";
import type { CSSProperties } from "react";
import { mulberry32 } from "@/src/domain/shared/seed";

import { BOOM_A, BOOM_B, BROKEN, HAZFILE, HEART as HEART16, P, ROCKET as ROCKET16, ROCKET_B, ROCKET_FIRE, TILES, TILE_PAL, robotArt, robotIdleSheet, robotPal, sheetUrl, spriteUrl, type Pal } from "./pixel-art";
export { spriteUrl };

/** Inline sprite that inherits `currentColor` (for icons). */
export function Sprite({ art, className }: { art: string[]; className?: string }) {
  const h = art.length, w = art[0].length;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={className} shapeRendering="crispEdges" aria-hidden>
      {art.flatMap((row, y) => [...row].map((ch, x) => (ch === "c" ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill="currentColor" /> : null)))}
    </svg>
  );
}

const BRICK = ["dddddddd", "lbbbdlbb", "bbbbdbbb", "dddddddd", "bbdlbbbd", "bbdbbbbd", "bbdbbbbd", "dddddddd"];

export const ICON = {
  star: ["...cc...", "...cc...", "cccccccc", ".cccccc.", "..cccc..", ".cc..cc.", ".c....c.", "........"],
  lock: ["..cccc..", ".c....c.", ".c....c.", "cccccccc", "ccc..ccc", "ccc..ccc", "cccccccc", "cccccccc"],
  clip: ["..cccc..", "cccccccc", "c......c", "c.cccc.c", "c......c", "c.cccc.c", "c......c", "cccccccc"],
  bolt: ["....ccc.", "...ccc..", "..ccc...", ".cccccc.", "...ccc..", "..ccc...", ".cc.....", "cc......"],
  check: ["........", "......cc", ".....cc.", "c...cc..", "cc.cc...", ".ccc....", "..c.....", "........"],
  mag: [".cccc...", "c....c..", "c....c..", ".cccc...", "....cc..", ".....cc.", "......cc", "........"],
};

export const spriteVars = {
  "--robot": spriteUrl(robotArt(0), robotPal(0)),
  "--robot-idle": robotIdleSheet(0),
  "--wall": spriteUrl(BRICK, { d: "#1c2350", b: "#3b4a8a", l: "#5a6cc4" }),
  "--floor0": spriteUrl(TILES.floor[0], TILE_PAL), "--floor1": spriteUrl(TILES.floor[1], TILE_PAL),
  "--floor2": spriteUrl(TILES.floor[2], TILE_PAL), "--floor3": spriteUrl(TILES.floor[3], TILE_PAL),
  "--walltop": spriteUrl(TILES.top, TILE_PAL), "--wall-panel": spriteUrl(TILES.panel, TILE_PAL), "--wall-pipe": spriteUrl(TILES.pipe, TILE_PAL),
  "--wall-rack": sheetUrl(TILES.rack, TILE_PAL), "--wall-term": sheetUrl(TILES.term, TILE_PAL),
  "--fog": spriteUrl(TILES.floor[0], { ...TILE_PAL, f: "#0a0e26", F: "#060817", i: "#0e1330" }),
  "--rocket": sheetUrl([ROCKET16, ROCKET_B], P), "--rocket-fire": sheetUrl([ROCKET_FIRE, ROCKET16], P),
  "--file": spriteUrl(HAZFILE, P), "--broken": spriteUrl(BROKEN, P),
  "--boom": sheetUrl([BOOM_A, BOOM_B], P),
  "--heart": spriteUrl(HEART16, P),
  "--heart0": spriteUrl(HEART16, { k: "#0a0c16", r: "#2a3050", R: "#1c2140", e: "#3a4270" }),
} as unknown as CSSProperties;

export const ARTS: Record<string, { art: string[]; pal: Pal }> = {
  rocket: { art: ROCKET16, pal: P },
  robot: { art: robotArt(0), pal: robotPal(0) },
  file: { art: HAZFILE, pal: P },
};


/** Pixel art with "noise": the higher `noise` (0..1), the more pixels are eroded or recoloured. */
export function PixelArt({ art, pal, noise = 0, seed = 1, className }: { art: string[]; pal: Pal; noise?: number; seed?: number; className?: string }) {
  const rnd = mulberry32(seed);
  const colors = Object.values(pal);
  const h = art.length, w = art[0].length;
  const rects: React.ReactNode[] = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const base = pal[art[y][x]];
    let fill: string | undefined = base;
    if (base) {
      if (rnd() < noise) fill = rnd() < 0.45 ? undefined : colors[Math.floor(rnd() * colors.length)];
    } else if (rnd() < noise * 0.22) fill = colors[Math.floor(rnd() * colors.length)];
    if (fill) rects.push(<rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={fill} />);
  }
  return <svg viewBox={`0 0 ${w} ${h}`} className={className} shapeRendering="crispEdges" aria-hidden>{rects}</svg>;
}
