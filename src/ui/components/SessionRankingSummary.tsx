import type { ReactNode } from "react";
import { Avatar } from "./Avatar";

export type RankingRow = { team: string; total: number; avatar?: number };
/** Ranking of the session and the 1-based position of this team in it (0 = not ranked). */
export type RankingSummary = { rows: RankingRow[]; rank: number } | null;

/** Top three of the session plus this team's own position. */
export function SessionRankingSummary({ summary, team }: { summary: RankingSummary; team: string }) {
  if (!summary) return <p className="muted">Cargando ranking...</p>;
  const { rows, rank } = summary;
  if (!rows.length) return null;
  const line = (row: RankingRow, index: number) => (
    <li key={`${row.team}-${index}`} className={row.team === team ? "me" : ""}><b>{index + 1}.</b><span><Avatar n={row.avatar ?? 0} size={22} /> {row.team}</span><em>{row.total}</em></li>
  );
  const items: ReactNode[] = rows.slice(0, 3).map(line);
  if (rank > 3) {
    if (rank > 4) items.push(<li key="d1" className="dots">···</li>);
    items.push(line(rows[rank - 1], rank - 1));
    if (rows.length > rank) items.push(<li key="d2" className="dots">···</li>);
  } else if (rows.length > 3) items.push(<li key="d3" className="dots">···</li>);
  return (
    <div className="board5">
      <div className="muted">RANKING DE LA SESIÓN{rank > 0 ? <> · vas el <strong style={{ color: "var(--gold)" }}>{rank}º</strong> de {rows.length}</> : null}</div>
      <ol>{items}</ol>
    </div>
  );
}
