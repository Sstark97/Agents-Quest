"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { GAMES } from "@/src/domain/games/catalog";
import { ICON, Sprite } from "@/src/ui/art/sprites";
import { music } from "@/src/ui/audio/sound";
import { useUnlockedLevels } from "@/src/ui/hooks/useUnlockedLevels";

const POLL_MS = 3000;

/** Keeps players out of a level the facilitator has not opened yet (and lets them in by itself when it opens). */
export function LevelGate({ children }: { children: ReactNode }) {
  const path = usePathname();
  const levelIndex = GAMES.findIndex((game) => game.href === path);
  const { unlocked, loading, session } = useUnlockedLevels(POLL_MS);
  const allowed = levelIndex < 0 || levelIndex < unlocked;
  const [entered, setEntered] = useState("");
  useEffect(() => { if (allowed && !loading) setEntered(path); }, [allowed, loading, path]);

  useEffect(() => { if (entered !== path || levelIndex < 0) return; music.play(levelIndex); return () => music.stop(); }, [entered, path, levelIndex]);

  if (entered === path) return <>{children}</>;
  if (loading) return null;

  return (
    <>
      <h1 className="glow">NIVEL BLOQUEADO</h1>
      <div className="card lockedscreen">
        <Sprite art={ICON.lock} className="biglock" />
        {session ? (
          <>
            <p>El <strong style={{ color: "var(--gold)" }}>{GAMES[levelIndex].title}</strong> todavía no está abierto. Lo abrirá el formador cuando acabe la explicación.</p>
            <p className="muted blink">Esperando al formador... este nivel se abrirá solo.</p>
          </>
        ) : (
          <p>Para jugar tienes que <Link href="/">unirte a una sesión</Link> con el código de tu formador.</p>
        )}
        <div className="row"><Link className="btn ghost" href="/">MENU</Link></div>
      </div>
    </>
  );
}
