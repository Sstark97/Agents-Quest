export type EnemyType = "multi" | "any" | "main" | "deps" | "tests" | "secrets";

export const ENEMIES: Record<EnemyType, { name: string; color: string }> = {
  multi: { name: "Test con 5 asserts mezclados", color: "#4fc3ff" },
  any: { name: "Usa «any» en TypeScript", color: "#b86bff" },
  main: { name: "Commit directo a main", color: "#ff9a3c" },
  deps: { name: "Añade dependencias sin avisar", color: "#ffd84a" },
  tests: { name: "Borra tests para que pasen", color: "#ff4f6a" },
  secrets: { name: "Mete secretos en el código", color: "#3ddc84" },
};

export type Rule = { id: string; text: string; blocks?: EnemyType };

export const RULES: Rule[] = [
  { id: "multi", blocks: "multi", text: "Un único comportamiento por test." },
  { id: "multi-v", text: "Escribe buenos tests." },
  { id: "any", blocks: "any", text: "Prohibido `any`: usa tipos explícitos o `unknown`." },
  { id: "any-v", text: "Escribe código TypeScript limpio." },
  { id: "main", blocks: "main", text: "Nunca hagas commit en main: trabaja en una rama feature/*." },
  { id: "main-v", text: "Sigue buenas prácticas de Git." },
  { id: "deps", blocks: "deps", text: "No añadas dependencias sin pedir aprobación." },
  { id: "deps-v", text: "Sé prudente con las librerías." },
  { id: "tests", blocks: "tests", text: "Nunca borres ni desactives tests para que pasen: arregla el código." },
  { id: "tests-v", text: "Haz que todo funcione." },
  { id: "secrets", blocks: "secrets", text: "Los secretos solo en variables de entorno, nunca en el repo." },
  { id: "secrets-v", text: "Cuida la seguridad." },
  { id: "junk1", text: "Eres un programador senior excelente." },
  { id: "junk2", text: "Responde siempre con mucho entusiasmo." },
];

/** How many rules fit in AGENTS.md. */
export const SLOTS = 4;
export const WAVES: { name: string; enemies: EnemyType[] }[] = [
  { name: "OLEADA 1", enemies: ["multi", "any", "multi", "main", "any", "multi"] },
  { name: "OLEADA 2", enemies: ["main", "deps", "main", "any", "tests", "deps", "main"] },
  { name: "OLEADA 3", enemies: ["tests", "secrets", "multi", "tests", "deps", "secrets", "tests", "multi"] },
];

export const WAVE_MAX_SCORE = 100;
export const MAX_SCORE = WAVES.length * WAVE_MAX_SCORE;

export type WaveReport = { stopped: number; total: number; leaked: EnemyType[]; idle: string[]; vague: string[] };

export const findRule = (id: string) => RULES.find((rule) => rule.id === id)!;

/** Bad behaviours stopped by the chosen rules. Vague rules stop nothing. */
export const blockedBehaviours = (ruleIds: string[]) =>
  new Set<EnemyType>(ruleIds.map((id) => findRule(id).blocks).filter(Boolean) as EnemyType[]);

/** How many enemies of each type a wave brings, in order of first appearance. */
export function enemyCounts(wave: number): [EnemyType, number][] {
  const counts = new Map<EnemyType, number>();
  if (wave < WAVES.length) WAVES[wave].enemies.forEach((enemy) => counts.set(enemy, (counts.get(enemy) ?? 0) + 1));
  return [...counts.entries()];
}

/** Summary of a finished wave: what got through and which rules were useless (vague) or not needed (idle). */
export function waveReport(wave: number, ruleIds: string[], outcome: { stopped: number; total: number; leaked: EnemyType[] }): WaveReport {
  const vague = ruleIds.filter((id) => !findRule(id).blocks).map((id) => findRule(id).text);
  const idle = ruleIds
    .filter((id) => findRule(id).blocks && !WAVES[wave].enemies.includes(findRule(id).blocks!))
    .map((id) => findRule(id).text);
  return { stopped: outcome.stopped, total: outcome.total, leaked: [...new Set(outcome.leaked)], idle, vague };
}

export const waveScore = (report: WaveReport) => Math.round((WAVE_MAX_SCORE * report.stopped) / report.total);

export const waveMistakes = (report: WaveReport): string[] => [
  ...report.leaked.map((type) => `Se coló: ${ENEMIES[type].name}`),
  ...report.vague.map((text) => `Eligió una regla vaga: «${text}»`),
];
