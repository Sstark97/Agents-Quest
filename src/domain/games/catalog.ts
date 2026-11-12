/**
 * Catalogue of levels. `id` and `href` are persisted (scores, rankings) and public (URLs),
 * so they keep their original Spanish values; everything else in the code base is English.
 */
export const GAMES = [
  { id: "nivel-1", short: "N1", title: "Nivel 1 · La cámara de permisos", concept: "Modos = niveles de permisos: Ask · Plan · Agent", href: "/juegos/nivel-1", maxScore: 300 },
  { id: "nivel-2", short: "N2", title: "Nivel 2 · Programa al robot", concept: "Anatomía de un prompt: objetivo · referencias · workflow", href: "/juegos/nivel-2", maxScore: 300 },
  { id: "nivel-3", short: "N3", title: "Nivel 3 · La mochila", concept: "Gestión de contexto: la mesa de trabajo es pequeña", href: "/juegos/nivel-3", maxScore: 300 },
  { id: "nivel-4", short: "N4", title: "Nivel 4 · Torres de defensa", concept: "Reglas y restricciones en AGENTS.md", href: "/juegos/nivel-4", maxScore: 300 },
  { id: "nivel-5", short: "N5", title: "Nivel 5 · La palanca de railes", concept: "Espectro de herramientas: editor · IDE · CLI", href: "/juegos/nivel-5", maxScore: 300 },
  { id: "nivel-6", short: "N6", title: "Nivel 6 · El equipo de agentes", concept: "Subagentes: repartir el trabajo y aislar el contexto", href: "/juegos/nivel-6", maxScore: 300 },
  { id: "nivel-7", short: "JEFE", title: "Jefe final · La misión completa", concept: "Los seis conceptos en una sola misión", href: "/juegos/nivel-7", maxScore: 300 },
] as const;

export type Game = (typeof GAMES)[number];
export type GameId = Game["id"];
export const GAME_IDS: string[] = GAMES.map((game) => game.id);

export const findGame = (id: unknown): Game | undefined => GAMES.find((game) => game.id === id);
