export type SlotKey = "goal" | "references" | "workflow";
export type Option = { text: string; points: number; effect: string };

export const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: "goal", label: "OBJETIVO", hint: "Qué tiene que conseguir" },
  { key: "references", label: "REFERENCIAS", hint: "Con qué información parte" },
  { key: "workflow", label: "WORKFLOW", hint: "Cómo debe trabajar" },
];
/** Best possible sum of a round: goal 0/2/4 · references 0/1/2 · workflow 0/1/2. */
export const MAX_ROUND_POINTS = 8;

export type Round = { task: string; art: "rocket" | "robot" | "file"; slots: Record<SlotKey, Option[]> };

export const ROUNDS: Round[] = [
  {
    task: "El equipo quiere que el listado de estados de ánimo salga ordenado.",
    art: "rocket",
    slots: {
      goal: [
        { points: 0, text: "Mejora el listado.", effect: "Es una dirección, no un destino: el agente decide qué significa «mejorar»." },
        { points: 2, text: "Ordena el listado de moods.", effect: "Mejor, pero ¿por qué campo? ¿ascendente o descendente? Tiene que adivinarlo." },
        { points: 4, text: "Modifica GET /list para que devuelva las entradas de la más reciente a la más antigua, sin cambiar el formato de cada elemento.", effect: "Destino con criterio de llegada: se sabe exactamente cuándo está cumplido." },
      ],
      references: [
        { points: 0, text: "(Sin referencias: que lo busque él.)", effect: "El agente gasta contexto explorando todo el repositorio." },
        { points: 1, text: "El código está en el backend.", effect: "Acota algo, pero sigue explorando a ciegas." },
        { points: 2, text: "Endpoint: backend/main.py (list_moods). Tests: backend/tests/.", effect: "Va directo a lo que necesita." },
      ],
      workflow: [
        { points: 0, text: "Hazlo como veas.", effect: "Sin puntos de control: no sabes qué hizo hasta el final." },
        { points: 1, text: "Hazlo y avísame cuando termines.", effect: "Sin tests no hay forma de comprobar el resultado." },
        { points: 2, text: "1. Lee main.py. 2. Escribe primero un test del orden. 3. Implementa. 4. Ejecuta uv run pytest.", effect: "Tiene un camino y puntos de control." },
      ],
    },
  },
  {
    task: "Hay que validar el email al registrar un usuario.",
    art: "robot",
    slots: {
      goal: [
        { points: 0, text: "Arregla el registro.", effect: "¿Arreglar qué? El agente toca lo que se le ocurra." },
        { points: 2, text: "Valida el email del registro.", effect: "Valida... ¿y qué hace si es inválido? ¿Error, aviso, lo ignora?" },
        { points: 4, text: "Rechaza con 422 las altas con email sin formato válido, sin cambiar la respuesta de las altas correctas.", effect: "Comportamiento, código de error y límite del cambio, todo claro." },
      ],
      references: [
        { points: 0, text: "Mira el proyecto.", effect: "Abre ficheros al azar y llena la mesa de contexto inútil." },
        { points: 1, text: "Está en el módulo de usuarios.", effect: "Mejor, pero aún busca el fichero exacto." },
        { points: 2, text: "Endpoint: backend/users.py (create_user). Modelo: User en backend/models.py. Tests: backend/tests/test_users.py.", effect: "Referencias exactas: cero exploración." },
      ],
      workflow: [
        { points: 0, text: "Sé autónomo y termina rápido.", effect: "Rápido y sin control: ya habrá tiempo de descubrir qué rompió." },
        { points: 1, text: "Haz los cambios y ejecuta los tests.", effect: "Verifica al final, pero sin test previo no sabes si prueba lo importante." },
        { points: 2, text: "1. Test que falle con email inválido. 2. Implementa la validación. 3. Ejecuta los tests. 4. Enséñame el diff antes del commit.", effect: "Test primero y punto de revisión antes de cerrar." },
      ],
    },
  },
  {
    task: "Falta poder borrar un estado de ánimo.",
    art: "file",
    slots: {
      goal: [
        { points: 0, text: "Añade borrado.", effect: "¿De qué? ¿Duro o lógico? ¿Y las entradas relacionadas?" },
        { points: 2, text: "Añade un endpoint para borrar moods.", effect: "Elige él la ruta, el método y los códigos de respuesta." },
        { points: 4, text: "Añade DELETE /moods/{id}: 204 si existe, 404 si no, sin afectar a las demás entradas.", effect: "Ruta, respuestas y límites definidos." },
      ],
      references: [
        { points: 0, text: "Ya sabes dónde.", effect: "No, no lo sabe. Tendrá que descubrirlo." },
        { points: 1, text: "En el backend, mira cómo lo hacen otros endpoints.", effect: "Le das criterio, pero sigue buscando." },
        { points: 2, text: "Sigue el patrón de create_mood en backend/main.py. Tests: backend/tests/test_moods.py.", effect: "Un ejemplo concreto a imitar." },
      ],
      workflow: [
        { points: 0, text: "Ve probando cosas.", effect: "Prueba y error sobre tu código real." },
        { points: 1, text: "Implementa y comprueba que no rompes nada.", effect: "Comprobar al final llega tarde para corregir el rumbo." },
        { points: 2, text: "1. Propón un plan de 3 pasos y espera mi OK. 2. Test primero. 3. Implementa. 4. uv run pytest.", effect: "Plan aprobado antes de tocar nada, y verificación al final." },
      ],
    },
  },
];

export const ROUND_MAX_SCORE = 100;
export const MAX_SCORE = ROUNDS.length * ROUND_MAX_SCORE;
/** Share of the round points from which the robot's build counts as a good one. */
export const GOOD_ROUND_RATIO = 0.7;

/** Index of the chosen option for every part of the prompt. */
export type Picks = Partial<Record<SlotKey, number>>;
export type OptionTone = "good" | "warn" | "bad";

/** Mistake labels for the session statistics: [the worst option, a middling option]. */
const WEAKNESSES: Record<SlotKey, [string, string]> = {
  goal: ["Objetivo vago (sin destino claro)", "Objetivo sin criterio de llegada"],
  references: ["Sin referencias (el agente explora a ciegas)", "Referencias imprecisas"],
  workflow: ["Sin puntos de control en el workflow", "Workflow sin forma de verificar el resultado"],
};

export const isPromptComplete = (picks: Picks) => SLOTS.every((slot) => picks[slot.key] !== undefined);
const pickedOption = (round: Round, picks: Picks, slot: SlotKey) => round.slots[slot][picks[slot]!];
const bestPoints = (round: Round, slot: SlotKey) => Math.max(...round.slots[slot].map((option) => option.points));

/** Quality of the prompt from 0 to 1; the parts that are still empty count as zero. */
export const promptQuality = (round: Round, picks: Picks) =>
  SLOTS.reduce((sum, slot) => sum + (picks[slot.key] !== undefined ? pickedOption(round, picks, slot.key).points : 0), 0) / MAX_ROUND_POINTS;

export const roundScore = (round: Round, picks: Picks) => Math.round(promptQuality(round, picks) * ROUND_MAX_SCORE);

export function optionTone(round: Round, picks: Picks, slot: SlotKey): OptionTone {
  const { points } = pickedOption(round, picks, slot);
  return points === bestPoints(round, slot) ? "good" : points === 0 ? "bad" : "warn";
}

export const roundWeaknesses = (round: Round, picks: Picks): string[] =>
  SLOTS.flatMap((slot) => {
    const tone = optionTone(round, picks, slot.key);
    return tone === "good" ? [] : [WEAKNESSES[slot.key][tone === "bad" ? 0 : 1]];
  });
