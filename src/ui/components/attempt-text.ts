import type { Game } from "@/src/domain/games/catalog";
import { ARRIVAL_BONUSES, FIRST_PERFECT_BONUS, bonusScore } from "@/src/domain/session/bonus";
import type { GamePlayStatus } from "@/src/domain/session/play-status";

type ScoredGame = Pick<Game, "maxScore">;
const LAST_ATTEMPT = 1;

export const OFFLINE_TAG = "sin conexión";
export const SPEND_NOTICE = "Se gasta un intento al pulsar PRESS START, aunque no termines. Cuenta tu mejor intento.";
export const PRACTICE_HINT = "La prueba de arriba sigue disponible: no puntúa.";

const plural = (count: number, one: string, many: string) => (count === 1 ? one : many);

/** «INTENTOS: 1 de 2 usados · te queda 1 · ¡último intento!» */
export function attemptsLine(used: number, limit: number): string {
  const left = Math.max(0, limit - used);
  const base = `INTENTOS: ${used} de ${limit} usados · ${plural(left, "te queda", "te quedan")} ${left}`;
  return left === LAST_ATTEMPT ? `${base} · ¡último intento!` : base;
}

/** Folded summary of the rules box: «Te quedan 2 de 2 intentos», «¡Último intento!» or «Sin intentos». */
export function attemptsShort(left: number, limit: number): string {
  if (left <= 0) return "Sin intentos";
  return left === LAST_ATTEMPT ? "¡Último intento!" : `Te quedan ${left} de ${limit} intentos`;
}

/** Folded summary of the bonuses still in play: «3 plazas de rapidez · pleno libre». */
export function bonusShort(status: GamePlayStatus): string {
  const free = Math.max(0, ARRIVAL_BONUSES.length - status.arrivalTaken);
  const speed = status.mine && status.mine.arrival > 0 ? "rapidez: ¡tuya!" : free === 0 ? "rapidez agotada" : `${free} ${plural(free, "plaza", "plazas")} de rapidez`;
  const perfect = status.mine && status.mine.perfect > 0 ? "pleno: ¡tuyo!" : status.perfectBy ? "pleno conseguido" : "pleno libre";
  return `${speed} · ${perfect}`;
}

export const exhaustedLine = (best: number | null) =>
  `Has agotado tus intentos en este nivel. Cuenta tu mejor puntuación: ${best === null ? "sin puntuación" : best}`;

export const startLabel = (left: number) => (left === LAST_ATTEMPT ? "PRESS START · ÚLTIMO INTENTO" : "PRESS START");

/** Whether a prize is still free, already won by another team, or won by this team. */
export type PrizeState = "free" | "taken" | "mine";
export type PrizeRow = { label: string; points: number; state: PrizeState; text: string };

const PRIZE_TEXT: Record<PrizeState, string> = { free: "Libre", taken: "Ocupada", mine: "¡Tuya!" };

/** «RAPIDEZ · con 240 o más»: what a team needs to compete for a speed place. */
export const speedHeading = (game: ScoredGame) => `RAPIDEZ · con ${bonusScore(game)} o más`;

/** «PRIMER PLENO · sacar 300». */
export const perfectHeading = (game: ScoredGame) => `PRIMER PLENO · sacar ${game.maxScore}`;

/** One row per speed place: 1º +45, 2º +30, 3º +15, each free, taken or this team's. */
export function speedPlaces(status: GamePlayStatus): PrizeRow[] {
  const minePlace = status.mine && status.mine.arrival > 0 ? status.mine.place : null;
  return ARRIVAL_BONUSES.map((points, index) => {
    const place = index + 1;
    const state: PrizeState = place === minePlace ? "mine" : index < status.arrivalTaken ? "taken" : "free";
    return { label: `${place}º`, points, state, text: PRIZE_TEXT[state] };
  });
}

/** The single first-perfect prize: free, won by another team (named) or this team's. */
export function perfectPrize(status: GamePlayStatus): PrizeRow {
  const state: PrizeState = status.mine && status.mine.perfect > 0 ? "mine" : status.perfectBy ? "taken" : "free";
  const text = state === "taken" ? `Conseguido por ${status.perfectBy}` : state === "mine" ? "¡Tuyo!" : PRIZE_TEXT.free;
  return { label: "1º", points: FIRST_PERFECT_BONUS, state, text };
}

export function resultLeftLine(left: number): string {
  return left <= 0 ? "No te quedan intentos en este nivel" : `${plural(left, "Te queda", "Te quedan")} ${left} ${plural(left, "intento", "intentos")}`;
}

export const retryLabel = (left: number) => `REINTENTAR (${left} ${plural(left, "restante", "restantes")})`;

/** Tells the team which score counts when an earlier attempt was better than this one. */
export const bestCountsLine = (best: number | null, points: number): string | null =>
  best !== null && best > points ? `En el ranking cuenta tu mejor intento: ${best}` : null;

export const restartLabel = (left: number) => `REINICIAR (gasta 1 · ${plural(left, "queda", "quedan")} ${left})`;

export const attemptsBadge = (used: number, limit: number) => (used >= limit ? "sin intentos" : `${used}/${limit}`);
