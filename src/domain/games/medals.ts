/** Medals a play can earn. The ids are persisted on the player's device, so they keep their original names. */
export const MEDALS: Record<string, { label: string; desc: string }> = {
  pleno: { label: "PLENO", desc: "Puntuación máxima" },
  primero: { label: "A LA PRIMERA", desc: "Nivel superado en el primer intento" },
  frugal: { label: "AHORRADOR", desc: "Sin ficheros rotos y con 2 lecturas o menos" },
  sinclear: { label: "MESA LIMPIA", desc: "Superado sin usar /clear" },
};
