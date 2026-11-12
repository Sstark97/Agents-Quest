"use client";
/** Chiptune sound effects generated with WebAudio (no audio files). */
const MUTE_KEY = "taller.mute";
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem(MUTE_KEY) === "1"; } catch {}

export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem(MUTE_KEY, m ? "1" : "0"); } catch {} }

const VOL_KEY = "taller.vol", MUSIC_KEY = "taller.music";
let volume = 0.6, musicOn = true;
try { const v = localStorage.getItem(VOL_KEY); if (v !== null) volume = Math.max(0, Math.min(1, Number(v))); musicOn = localStorage.getItem(MUSIC_KEY) !== "0"; } catch {}
export const getVolume = () => volume;
export function setVolume(v: number) { volume = Math.max(0, Math.min(1, v)); try { localStorage.setItem(VOL_KEY, String(volume)); } catch {} }
export const isMusicOn = () => musicOn;
export function setMusicOn(on: boolean) { musicOn = on; try { localStorage.setItem(MUSIC_KEY, on ? "1" : "0"); } catch {} }

function audio() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    try { ctx = new AC(); } catch { return null; }
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}
/** Must be called from a user gesture to unlock audio on mobile devices. */
export const unlockAudio = () => { audio(); };

function tone(freq: number, dur: number, at = 0, type: OscillatorType = "square", vol = 0.05, to?: number) {
  if (muted) return;
  const c = audio(); if (!c) return;
  const t0 = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  g.gain.setValueAtTime(vol * volume, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(c.destination); o.start(t0); o.stop(t0 + dur + 0.02);
}

export const sfx = {
  click: () => tone(880, 0.05, 0, "square", 0.03),
  ok: () => { tone(660, 0.08); tone(990, 0.12, 0.08); },
  bad: () => { tone(220, 0.18, 0, "sawtooth", 0.06, 110); },
  hit: () => { tone(160, 0.25, 0, "sawtooth", 0.08, 40); },
  coin: () => { tone(988, 0.06); tone(1319, 0.2, 0.06); },
  win: () => [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(f, 0.14, i * 0.11, "square", 0.05)),
  lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.2, i * 0.16, "triangle", 0.07)),
};

/* ---------- music: 16-step chiptune loops, one per level ---------- */
type Track = { bpm: number; root: number; scale: number[]; lead: number[]; bass: number[] };
const MINOR = [0, 3, 5, 7, 10], MAJOR = [0, 2, 4, 7, 9];
const L1 = [0, -1, 2, -1, 4, 2, 3, -1, 5, -1, 4, 2, 3, 2, 0, -1];
const L2 = [4, 4, -1, 3, 2, -1, 0, 2, 3, -1, 5, 4, 2, -1, 0, -1];
const L3 = [0, 2, 4, 5, 4, 2, 0, -1, 1, 3, 5, 6, 5, 3, 1, -1];
const B1 = [0, -1, 0, -1, 3, -1, 3, -1, 2, -1, 2, -1, 4, -1, 4, -1];
const B2 = [0, 0, -1, 0, 3, 3, -1, 3, 4, 4, -1, 4, 2, 2, -1, 2];
const TRACKS: Track[] = [
  { bpm: 104, root: 57, scale: MINOR, lead: L1, bass: B1 },
  { bpm: 112, root: 60, scale: MAJOR, lead: L2, bass: B1 },
  { bpm: 96, root: 55, scale: MAJOR, lead: L3, bass: B1 },
  { bpm: 120, root: 52, scale: MINOR, lead: L2, bass: B2 },
  { bpm: 126, root: 62, scale: MAJOR, lead: L1, bass: B2 },
  { bpm: 108, root: 59, scale: MINOR, lead: L3, bass: B1 },
  { bpm: 138, root: 50, scale: MINOR, lead: L1, bass: B2 },
];
const hz = (t: Track, deg: number, oct: number) => 440 * 2 ** ((t.root + t.scale[deg % t.scale.length] + 12 * (Math.floor(deg / t.scale.length) + oct) - 69) / 12);

let cur: Track | null = null, step = 0, nextAt = 0, loop: ReturnType<typeof setInterval> | null = null;
function note(c: AudioContext, freq: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(vol * volume, at); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g); g.connect(c.destination); o.start(at); o.stop(at + dur + 0.02);
}
function tick() {
  if (!cur || muted || !musicOn || volume === 0 || !ctx || ctx.state !== "running") return;
  if (nextAt < ctx.currentTime) nextAt = ctx.currentTime + 0.05;
  const beat = 60 / cur.bpm / 2;
  while (nextAt < ctx.currentTime + 0.3) {
    const l = cur.lead[step % 16], b = cur.bass[step % 16];
    if (l >= 0) note(ctx, hz(cur, l, 1), nextAt, beat * 0.9, "square", 0.012);
    if (b >= 0) note(ctx, hz(cur, b, -1), nextAt, beat * 1.6, "triangle", 0.035);
    nextAt += beat; step++;
  }
}
export const music = {
  /** Starts (or switches to) the loop of level `i`. It only plays after a user gesture. */
  play(i: number) { cur = TRACKS[i % TRACKS.length]; step = 0; nextAt = 0; if (!loop) loop = setInterval(tick, 90); },
  stop() { cur = null; },
};
