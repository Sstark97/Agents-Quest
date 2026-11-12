import Link from "next/link";
import { GAMES } from "@/src/domain/games/catalog";
import type { LevelState, ScoreBoard } from "@/src/domain/games/progress";
import { ICON, Sprite } from "@/src/ui/art/sprites";

type Props = { states: LevelState[]; scores: ScoreBoard; medals: string[]; canPlay: boolean };

/** One card per level with its state, best score and medals. */
export function LevelList({ states, scores, medals, canPlay }: Props) {
  return (
    <>
      {GAMES.map((game, i) => {
        const state = states[i];
        const medalCount = medals.filter((medal) => medal.startsWith(`${game.id}:`)).length;
        return (
          <div className={`card ${state === "locked" ? "locked" : ""}`} key={game.id}>
            <h2>{state === "locked" && <Sprite art={ICON.lock} className="ico" />}{game.title}</h2>
            <p className="muted">{game.concept}</p>
            <div className="row">
              {state === "locked" ? (
                <>
                  <button className="btn" disabled>BLOQUEADO</button>
                  <span>Lo abrirá el formador</span>
                </>
              ) : canPlay ? <Link className="btn" href={game.href}>{state === "done" ? "JUGAR OTRA VEZ" : "▶ JUGAR"}</Link> : <button className="btn" disabled>Pon nombre a tu equipo</button>}
              {state === "done" && <span className="chip plan">SUPERADO</span>}
              {medalCount > 0 && <span className="chip medalchip"><Sprite art={ICON.star} className="ico" />×{medalCount}</span>}
              {scores[game.id] !== undefined && state !== "locked" && <span>Mejor: <strong>{scores[game.id]}</strong> / {game.maxScore}</span>}
            </div>
          </div>
        );
      })}
    </>
  );
}
