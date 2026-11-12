import { GAMES } from "@/src/domain/games/catalog";
import { LESSONS } from "@/src/domain/games/lessons";
import type { ScoreBoard } from "@/src/domain/games/progress";
import { shareOfPlays, summarizeLevel, type Stats } from "@/src/domain/session/stats";

/** What to discuss in class: per level, how many teams pass it and their most common mistakes. */
export function ClassStats({ stats, teams }: { stats: Stats; teams: { games: ScoreBoard }[] }) {
  return (
    <div className="statsbox">
      <h2>PARA COMENTAR EN CLASE</h2>
      <p className="muted">{teams.length} equipo{teams.length === 1 ? "" : "s"} con puntuación. Se actualiza solo.</p>
      {GAMES.every((game) => !stats.plays[game.id]) && <p className="muted">Aún no hay partidas completadas.</p>}
      {GAMES.filter((game) => stats.plays[game.id]).map((game) => {
        const { plays, topMistakes, teamsPlayed, teamsPassed, averageScore } = summarizeLevel(game, stats, teams);
        return (
          <div key={game.id} className="statlevel">
            <div className="stathead"><strong>{game.title}</strong><span>{teamsPassed}/{teamsPlayed} equipos lo superan · media {averageScore}/{game.maxScore} · {plays} partida{plays > 1 ? "s" : ""}</span></div>
            {topMistakes.length === 0 ? <p>Sin errores registrados.</p> : topMistakes.map((mistake) => (
              <div key={mistake.tag} className="statrow"><span>{mistake.tag}</span><i><b style={{ width: `${Math.min(100, shareOfPlays(mistake.count, plays))}%` }} /></i><em>{shareOfPlays(mistake.count, plays)}%</em></div>
            ))}
            <p className="statask">Pregunta: {LESSONS[game.id]?.ask}</p>
          </div>
        );
      })}
    </div>
  );
}
