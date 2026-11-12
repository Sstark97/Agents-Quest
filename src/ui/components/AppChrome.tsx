"use client";
import { useEffect, useState } from "react";
import { getVolume, isMusicOn, isMuted, setMusicOn, setMuted, setVolume, sfx, unlockAudio } from "@/src/ui/audio/sound";
import { useServices } from "@/src/ui/services-context";

const FLUSH_EVERY_MS = 15000;

/** App-wide helpers: click sound, sound settings and re-sending of pending scores. */
export function AppChrome() {
  const { scores } = useServices();
  const [muted, setMutedState] = useState(false);
  const [open, setOpen] = useState(false);
  const [volume, setVolumeState] = useState(60);
  const [musicOn, setMusicOnState] = useState(true);
  useEffect(() => {
    setMutedState(isMuted()); setVolumeState(Math.round(getVolume() * 100)); setMusicOnState(isMusicOn());
    const onPointerDown = (event: Event) => {
      unlockAudio();
      const target = (event.target as HTMLElement | null)?.closest?.("button, a.btn, .dots i");
      if (target && !(target as HTMLButtonElement).disabled && !target.closest(".sndbox")) sfx.click();
    };
    document.addEventListener("pointerdown", onPointerDown);
    const flush = () => { scores.flushPending().catch(() => {}); };
    flush();
    window.addEventListener("online", flush);
    const timer = setInterval(flush, FLUSH_EVERY_MS);
    return () => { document.removeEventListener("pointerdown", onPointerDown); window.removeEventListener("online", flush); clearInterval(timer); };
  }, [scores]);
  return (
    <div className="sndbox">
      {open && (
        <div className="sndpanel">
          <button onClick={() => { const next = !muted; setMuted(next); setMutedState(next); if (!next) sfx.coin(); }}>SONIDO {muted ? "OFF" : "ON"}</button>
          <button onClick={() => { const next = !musicOn; setMusicOn(next); setMusicOnState(next); }} disabled={muted}>MÚSICA {musicOn && !muted ? "ON" : "OFF"}</button>
          <label>VOLUMEN {volume}
            <input type="range" min={0} max={100} step={10} value={volume} aria-label="Volumen" onChange={(event) => { const next = Number(event.target.value); setVolumeState(next); setVolume(next / 100); }} onPointerUp={() => sfx.coin()} />
          </label>
        </div>
      )}
      <button className="sndbtn" aria-label="Ajustes de sonido" aria-expanded={open} onClick={() => setOpen(!open)}>{muted || volume === 0 ? "♪ OFF" : "♪ ON"}</button>
    </div>
  );
}
