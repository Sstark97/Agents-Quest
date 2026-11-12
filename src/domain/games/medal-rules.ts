/** Medals every level can award, on top of the ones specific to each level. */
export function earnedMedals({ levelMedals, points, maxPoints, passed, attempt }: { levelMedals: string[]; points: number; maxPoints: number; passed: boolean; attempt: number }): string[] {
  const medals = [...levelMedals];
  if (points >= maxPoints) medals.push("pleno");
  if (passed && attempt === 1) medals.push("primero");
  return medals;
}
