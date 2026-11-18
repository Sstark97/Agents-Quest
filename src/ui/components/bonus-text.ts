import type { GameBonus } from "@/src/domain/session/bonus";

type Breakdown = { base: number; bonus: { arrival: number; perfect: number } };

/** «Base 300 + Rapidez 45 + Primer pleno 30», without the parts that are zero. Empty when there is no bonus. */
export function breakdownText({ base, bonus }: Breakdown): string {
  if (bonus.arrival + bonus.perfect === 0) return "";
  const parts: [string, number][] = [["Base", base], ["Rapidez", bonus.arrival], ["Primer pleno", bonus.perfect]];
  return parts.filter(([, amount]) => amount > 0).map(([label, amount]) => `${label} ${amount}`).join(" + ");
}

/** Messages that tell a team what it earned in one level. */
export function levelBonusMessages(bonus: GameBonus | undefined): string[] {
  if (!bonus) return [];
  const messages: string[] = [];
  if (bonus.arrival > 0 && bonus.place !== null) messages.push(`¡${bonus.place}º en superarlo con buena nota! Rapidez +${bonus.arrival}`);
  if (bonus.perfect > 0) messages.push(`¡Primer pleno del nivel! +${bonus.perfect}`);
  return messages;
}

/** Announcement shown on the projector when a team gets the first perfect score of a level. */
export const perfectAnnouncement = (gameTitle: string, team: string) => `★ PRIMER PLENO · ${gameTitle}: ${team} ★`;
