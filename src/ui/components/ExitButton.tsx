"use client";
import Link from "next/link";
import { useState } from "react";
import { useLockScroll } from "@/src/ui/hooks/useLockScroll";

/** Button to leave a level (with confirmation), for the HUD of every game. */
export function ExitButton() {
  const [asking, setAsking] = useState(false);
  return (
    <>
      <button className="exitbtn" onClick={() => setAsking(true)}>✕ SALIR</button>
      {asking && <ExitDialog onClose={() => setAsking(false)} />}
    </>
  );
}

function ExitDialog({ onClose }: { onClose: () => void }) {
  useLockScroll();
  return (
    <div className="overlay" onClick={onClose}>
      <div className="card modal compact" onClick={(event) => event.stopPropagation()}>
        <h2>¿SALIR DEL NIVEL?</h2>
        <p>Perderás el progreso de esta partida y no se enviará ninguna puntuación. Podrás volver a jugarlo cuando quieras.</p>
        <div className="row">
          <button className="btn start" onClick={onClose}>SEGUIR JUGANDO</button>
          <Link className="btn danger" href="/">SALIR AL MENU</Link>
        </div>
      </div>
    </div>
  );
}
