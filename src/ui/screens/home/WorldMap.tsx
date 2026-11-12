import type * as React from "react";
import { GAMES } from "@/src/domain/games/catalog";
import type { LevelState } from "@/src/domain/games/progress";
import { BUILDINGS, BUILD_PAL, island, robotIdleSheet, robotWalkSheet, spriteUrl } from "@/src/ui/art/pixel-art";
import { ICON, Sprite } from "@/src/ui/art/sprites";

/** Centre of every island, in units (the world is 40 × 22). */
export const SPOTS = [[6, 7.6], [15, 5.4], [24, 7.6], [33, 5.4], [30, 15.6], [20, 17.4], [10, 15.6]];
/** Islands drawn slightly higher so that the path zigzags. */
const RAISED = [1, 3];
/** Offset from the centre of an island to where the robot stands on it. */
const HERO_OFFSET = { x: 2.9, y: 3.1 };
const WORLD = { "--s-island": spriteUrl(island(), BUILD_PAL), ...Object.fromEntries(BUILDINGS.map((building, i) => [`--s-b${i}`, spriteUrl(building, BUILD_PAL)])) } as React.CSSProperties;
const STARS = Array.from({ length: 40 }, (_, i) => ({ left: `${(i * 37 + 11) % 100}%`, top: `${(i * 53 + 7) % 100}%`, animationDelay: `${(i % 7) * 0.4}s` }));
const units = (n: number | string) => `calc(var(--u) * ${n})`;

type Props = {
  states: LevelState[]; avatar: number; canPlay: boolean;
  /** Island of the next level to play. */
  here: number;
  /** Island the robot is standing on (or walking to). */
  heroAt: number; walking: boolean;
  onEnter: (href: string) => void;
};

/** Map of levels: one island per level, joined by a trail, with the robot on the next one to play. */
export function WorldMap({ states, avatar, canPlay, here, heroAt, walking, onEnter }: Props) {
  return (
    <div className="stage"><div className="scene world" style={{ ...WORLD, "--bot-idle": robotIdleSheet(avatar), "--bot-walk": robotWalkSheet(avatar) } as React.CSSProperties} aria-label="Mapa de niveles">
      {STARS.map((star, i) => <i key={i} className="star" style={star} />)}
      <div className="planet" />
      {SPOTS.slice(1).map(([x, y], i) => {
        const [fromX, fromY] = SPOTS[i]; const dx = x - fromX, dy = y - fromY;
        return <div key={i} className={`trail ${states[i] === "done" ? "on" : ""}`} style={{ left: units(fromX), top: units(fromY), width: units(Math.hypot(dx, dy).toFixed(2)), transform: `rotate(${Math.atan2(dy, dx).toFixed(3)}rad)` }} />;
      })}
      {GAMES.map((game, i) => {
        const state = states[i];
        return (
          <button key={game.id} className={`isle ${state} ${RAISED.includes(i) ? "up" : ""} ${i === here ? "here" : ""}`} disabled={state === "locked" || !canPlay} title={game.title} onClick={() => onEnter(game.href)}
            style={{ left: units(SPOTS[i][0]), top: units(SPOTS[i][1]), animationDelay: `${i * 0.35}s` }}>
            <i className="bld" style={{ backgroundImage: `var(--s-b${i})` }} />
            {state === "locked" && <Sprite art={ICON.lock} className="isleico" />}
            {state === "done" && <Sprite art={ICON.star} className="isleico star" />}
            <span>{i === GAMES.length - 1 ? "JEFE" : i + 1}<em> · {game.title.split("· ")[1]}</em></span>
          </button>
        );
      })}
      <i className={`hero ${walking ? "walk" : ""}`} style={{ left: units(SPOTS[heroAt][0] - HERO_OFFSET.x), top: units(SPOTS[heroAt][1] - HERO_OFFSET.y) }} />
    </div></div>
  );
}
