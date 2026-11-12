/** Returns a shuffled copy. Not seeded: every play gets a different order. */
export const shuffle = <T,>(items: T[]) => [...items].sort(() => Math.random() - 0.5);
