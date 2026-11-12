"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { GAMES } from "@/src/domain/games/catalog";
import { GLOSSARY } from "@/src/domain/games/glossary";
import { isPassed, type ScoreBoard } from "@/src/domain/games/progress";
import { ICON, Sprite } from "@/src/ui/art/sprites";
import { useServices } from "@/src/ui/services-context";

/** Concept cards: they open when the matching level is passed. */
export function GlossaryScreen() {
  const { progress, levelAccess } = useServices();
  const [scores, setScores] = useState<ScoreBoard>({});
  const [allOpen, setAllOpen] = useState(false);
  useEffect(() => { setScores(progress.scores()); setAllOpen(levelAccess.allUnlocked()); }, [progress, levelAccess]);
  const isOpen = (i: number) => allOpen || isPassed(GAMES[i], scores);
  const cardsOf = (gameId: string) => GLOSSARY[gameId] ?? [];
  const total = GAMES.reduce((sum, game) => sum + cardsOf(game.id).length, 0);
  const owned = GAMES.reduce((sum, game, i) => sum + (isOpen(i) ? cardsOf(game.id).length : 0), 0);

  return (
    <>
      <h1 className="glow">GLOSARIO</h1>
      <p className="muted">Cada nivel superado abre sus fichas. Llevas <strong style={{ color: "var(--gold)" }}>{owned} de {total}</strong>.</p>
      {GAMES.map((game, i) => (
        <div key={game.id} className={`card ${isOpen(i) ? "" : "locked"}`}>
          <h2>{!isOpen(i) && <Sprite art={ICON.lock} className="ico" />}{game.title}</h2>
          {isOpen(i) ? (
            <dl className="gloss">
              {cardsOf(game.id).map((entry) => (
                <div key={entry.term}>
                  <dt>{entry.term}</dt>
                  <dd>{entry.def}</dd>
                  <dd className="eg">Ejemplo: {entry.eg}</dd>
                </div>
              ))}
            </dl>
          ) : <p className="muted">{cardsOf(game.id).length} ficha(s) por abrir. Supera el nivel para leerlas.</p>}
        </div>
      ))}
      <Link href="/">&lt; Volver</Link>
    </>
  );
}
