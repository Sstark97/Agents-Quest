import type { PlayStatusView } from "@/src/application/client/play-status";
import { findGame } from "@/src/domain/games/catalog";
import { OFFLINE_TAG, PRACTICE_HINT, SPEND_NOTICE, attemptsLine, attemptsShort, bonusShort, exhaustedLine, perfectHeading, perfectPrize, speedHeading, speedPlaces, type PrizeRow } from "./attempt-text";

type Props = { game: string; view: PlayStatusView; hasPractice: boolean };

/**
 * Attempts left and bonuses in play of one level, as the server reports them, folded into one line that opens
 * on tap. Nothing without a limited session.
 */
export function PlayRules({ game, view, hasPractice }: Props) {
  const catalog = findGame(game);
  if (view.state === "none" || !catalog) return null;
  const { limit } = view.status;
  const status = view.status.games[game];
  if (!status) return null;
  const { used, left } = status;
  const exhausted = left === 0;
  const lastOne = left === 1;
  return (
    <details className="rules">
      <summary>
        <span className="rulestitle">REGLAS DE LA PARTIDA{view.state === "offline" && <span className="muted"> · {OFFLINE_TAG}</span>}</span>
        <span className="rulestoggle" aria-hidden="true" />
        <span className="rulesbrief"><strong className={exhausted ? "bad" : lastOne ? "warn" : ""}>{attemptsShort(left, limit)}</strong> · {bonusShort(status)}</span>
      </summary>
      <div className="lvpips" aria-hidden="true">
        {Array.from({ length: limit }, (_, index) => <i key={index} className={index < left ? (lastOne ? "mid" : "ok") : ""} />)}
      </div>
      <p className={`fb ${exhausted ? "bad" : lastOne ? "warn" : ""}`}>{attemptsLine(used, limit)}</p>
      {exhausted ? (
        <>
          <p className="fb bad">{exhaustedLine(status.best)}</p>
          {hasPractice && <p className="muted">{PRACTICE_HINT}</p>}
        </>
      ) : <p className="muted">{SPEND_NOTICE}</p>}
      <div className="guidehead"><span>BONUS EN JUEGO</span></div>
      <PrizeTable heading={speedHeading(catalog)} rows={speedPlaces(status)} />
      <PrizeTable heading={perfectHeading(catalog)} rows={[perfectPrize(status)]} />
    </details>
  );
}

/** One bonus and its places: position, points and whether it is still free. */
function PrizeTable({ heading, rows }: { heading: string; rows: PrizeRow[] }) {
  return (
    <div className="prizes">
      <div className="prizehead">{heading}</div>
      {rows.map((row) => (
        <div key={row.label} className={`prize ${row.state}`}>
          <span className="pos">{row.label}</span><span className="pts">+{row.points}</span><span className="state">{row.text}</span>
        </div>
      ))}
    </div>
  );
}
