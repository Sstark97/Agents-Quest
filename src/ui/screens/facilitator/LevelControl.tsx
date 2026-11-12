import { GAMES } from "@/src/domain/games/catalog";

/** Opens and closes levels for the teams of a session. */
export function LevelControl({ unlocked, onChange }: { unlocked: number; onChange: (level: number) => void }) {
  return (
    <div className="levelctl">
      <h2>NIVELES</h2>
      <p className="muted">Los equipos solo pueden jugar los niveles que abras. Se les desbloquean al instante en su pantalla.</p>
      <ol>
        {GAMES.map((game, i) => (
          <li key={game.id} className={i < unlocked ? "on" : ""}>
            <span className="lvl">{i < unlocked ? "ABIERTO" : "CERRADO"}</span>
            <span className="lvname">{game.title}</span>
          </li>
        ))}
      </ol>
      <div className="row">
        {unlocked < GAMES.length && <button className="btn start" onClick={() => onChange(unlocked + 1)}>ABRIR NIVEL {unlocked + 1}</button>}
        {unlocked > 0 && <button className="btn ghost" onClick={() => onChange(unlocked - 1)}>CERRAR NIVEL {unlocked}</button>}
        {unlocked < GAMES.length && <button className="btn ghost" onClick={() => onChange(GAMES.length)}>ABRIR TODOS</button>}
      </div>
    </div>
  );
}
