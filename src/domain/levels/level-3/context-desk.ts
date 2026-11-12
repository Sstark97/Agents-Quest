export type Kind = "file" | "log" | "chat" | "doc";
export type Item = { id: string; name: string; kind: Kind; size: number };

export const CAPACITY = 8;
export const CLEAR_COST = 10;
export const NOISE_COST = 9;

export const ITEMS: Record<string, Item> = {
  agents: { id: "agents", name: "AGENTS.md", kind: "doc", size: 1 },
  tax: { id: "tax", name: "tax.service.ts", kind: "file", size: 2 },
  stack: { id: "stack", name: "stacktrace_iva.log", kind: "log", size: 1 },
  readme: { id: "readme", name: "README.md", kind: "doc", size: 1 },
  biglog: { id: "biglog", name: "app_completo.log (8 MB)", kind: "log", size: 3 },
  css: { id: "css", name: "landing.css", kind: "file", size: 2 },
  chat: { id: "chat", name: "chat de ayer (47 msgs)", kind: "chat", size: 2 },
  lock: { id: "lock", name: "package-lock.json", kind: "file", size: 3 },
  auth: { id: "auth", name: "auth.service.ts", kind: "file", size: 2 },
  oauth: { id: "oauth", name: "oauth_google.md", kind: "doc", size: 2 },
  infra: { id: "infra", name: "terraform/*.tf", kind: "file", size: 3 },
  hdr: { id: "hdr", name: "header.component.css", kind: "file", size: 1 },
  tokens: { id: "tokens", name: "design-tokens.md", kind: "doc", size: 1 },
};

export type Round = { task: string; needed: string[]; pool: string[] };

export const ROUNDS: Round[] = [
  { task: "Arregla el cálculo del IVA en el checkout.", needed: ["agents", "tax", "stack"], pool: ["agents", "tax", "stack", "readme", "biglog", "css", "chat", "lock"] },
  { task: "Añade el login con Google.", needed: ["agents", "auth", "oauth"], pool: ["agents", "auth", "oauth", "readme", "infra", "lock", "chat"] },
  { task: "Cambia el color de los botones del header.", needed: ["agents", "hdr", "tokens"], pool: ["agents", "hdr", "tokens", "biglog", "infra", "auth", "css"] },
];

export const ROUND_MAX_SCORE = 100;
export const MAX_SCORE = ROUNDS.length * ROUND_MAX_SCORE;
/** Round score from which the task counts as well done. */
export const GOOD_ROUND_SCORE = 70;
/** Final score needed, without any /clear, to earn the "sinclear" medal. */
const NO_CLEAR_MEDAL_SCORE = 180;

/** The agent's context window: what is loaded, oldest first. */
export type Desk = Item[];
export type Evaluation = { have: string[]; missing: string[]; noise: Item[]; score: number };

export const usedSlots = (items: Item[]) => items.reduce((slots, item) => slots + item.size, 0);
export const isOnDesk = (desk: Desk, id: string) => desk.some((item) => item.id === id);

/** Loads an item; when the desk overflows, the oldest items are forgotten until it fits again. */
export function loadItem(desk: Desk, item: Item): { desk: Desk; evicted: Item[] } {
  const next = [...desk, item];
  const evicted: Item[] = [];
  while (usedSlots(next) > CAPACITY) evicted.push(next.shift()!);
  return { desk: next, evicted };
}

export const removeItem = (desk: Desk, id: string): Desk => desk.filter((item) => item.id !== id);

/** Scores a task: share of the needed items on the desk, minus a penalty per slot of noise. */
export function evaluateDesk(round: Round, desk: Desk): Evaluation {
  const have = round.needed.filter((id) => isOnDesk(desk, id));
  const missing = round.needed.filter((id) => !have.includes(id));
  const noise = desk.filter((item) => !round.needed.includes(item.id));
  const score = Math.max(0, Math.round((ROUND_MAX_SCORE * have.length) / round.needed.length - NOISE_COST * usedSlots(noise)));
  return { have, missing, noise, score };
}

export const evaluationMistakes = (evaluation: Evaluation): string[] => [
  ...evaluation.missing.map((id) => `Le faltó: ${ITEMS[id].name}`),
  ...evaluation.noise.map((item) => `Cargó ruido: ${item.name}`),
];

export const totalScore = (roundScores: number[], clears: number) =>
  Math.max(0, roundScores.reduce((sum, score) => sum + score, 0) - clears * CLEAR_COST);

export const runMedals = (total: number, clears: number): string[] => (clears === 0 && total >= NO_CLEAR_MEDAL_SCORE ? ["sinclear"] : []);
