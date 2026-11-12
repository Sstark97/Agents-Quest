export type Lane = "main" | "a" | "b";
export const LANES: Lane[] = ["main", "a", "b"];
export const SUBAGENTS: Lane[] = ["a", "b"];
export const LANE_NAME: Record<Lane, string> = { main: "AGENTE PRINCIPAL", a: "SUBAGENTE A", b: "SUBAGENTE B" };
/** Context slots of every agent. */
export const CAPACITY = 5;

/** load = context it takes · area = file it edits · after = needs the result of another task · you = must be discussed with the person */
export type Task = { id: string; text: string; load: number; area?: string; after?: string; you?: boolean };
export type Round = { mission: string; tasks: Task[] };

export const ROUNDS: Round[] = [
  {
    mission: "Añadir el pago con tarjeta al checkout.",
    tasks: [
      { id: "a", text: "Buscar por todo el repo dónde se calculan los precios", load: 4 },
      { id: "b", text: "Acordar qué proveedor de pagos se usa", load: 1, you: true },
      { id: "c", text: "Implementar el servicio de pagos", load: 3, area: "payments.ts" },
      { id: "d", text: "Escribir los tests del servicio de pagos", load: 2, area: "payments.test.ts", after: "c" },
      { id: "e", text: "Corregir una errata en un mensaje de error", load: 1, area: "payments.ts" },
    ],
  },
  {
    mission: "Migrar la aplicación de JavaScript a TypeScript.",
    tasks: [
      { id: "a", text: "Listar los ficheros .js y quién depende de quién", load: 2 },
      { id: "b", text: "Migrar el módulo de usuarios", load: 3, area: "users/" },
      { id: "c", text: "Migrar el módulo de pedidos", load: 3, area: "orders/" },
      { id: "d", text: "Decidir si se activa el modo estricto", load: 1, you: true },
      { id: "e", text: "Actualizar tsconfig.json con lo decidido", load: 1, area: "tsconfig.json", after: "d" },
    ],
  },
  {
    mission: "Averiguar por qué la web va lenta y arreglarlo.",
    tasks: [
      { id: "a", text: "Leer tres días de logs del servidor", load: 4 },
      { id: "b", text: "Medir cuánto tarda cada consulta a la base de datos", load: 3 },
      { id: "c", text: "Reescribir la consulta más lenta", load: 2, area: "queries.sql", after: "b" },
      { id: "d", text: "Confirmar si se puede añadir un índice", load: 1, you: true },
      { id: "e", text: "Añadir el índice en una migración", load: 1, area: "migrations/", after: "d" },
    ],
  },
];

export const ROUND_MAX_SCORE = 100;
export const MAX_SCORE = ROUNDS.length * ROUND_MAX_SCORE;
/** Slots the main agent spends on the summary of every subagent in use. */
const SUMMARY_LOAD = 1;
/** A subagent carrying this little is not worth briefing. */
const TRIVIAL_LOAD = 1;
const PENALTY = { overloadPerSlot: 10, delegatedDecision: 25, parallelDependency: 20, sharedFile: 25, trivialSubagent: 10 };

/** Which agent does each task (by task id). */
export type Assignment = Record<string, Lane>;
export type Issue = { tag: string; cost: number; text: string };
export type Evaluation = { score: number; issues: Issue[] };

export const tasksOf = (round: Round, assignment: Assignment, lane: Lane) => round.tasks.filter((task) => assignment[task.id] === lane);
const taskLoad = (tasks: Task[]) => tasks.reduce((slots, task) => slots + task.load, 0);
/** How many subagents have at least one task. */
export const activeSubagents = (round: Round, assignment: Assignment) =>
  SUBAGENTS.filter((lane) => round.tasks.some((task) => assignment[task.id] === lane)).length;

/** Context an agent takes: its tasks and, for the main one, a slot per summary of every subagent in use. */
export const laneLoad = (round: Round, assignment: Assignment, lane: Lane) =>
  taskLoad(tasksOf(round, assignment, lane)) + (lane === "main" ? activeSubagents(round, assignment) * SUMMARY_LOAD : 0);

export const loads = (round: Round, assignment: Assignment): Record<Lane, number> => ({
  main: laneLoad(round, assignment, "main"),
  a: laneLoad(round, assignment, "a"),
  b: laneLoad(round, assignment, "b"),
});

function overloadIssues(round: Round, assignment: Assignment): Issue[] {
  return LANES.flatMap((lane) => {
    const load = laneLoad(round, assignment, lane);
    const over = load - CAPACITY;
    if (over <= 0) return [];
    const isMain = lane === "main";
    return [{
      tag: isMain ? "Saturó el contexto del agente principal" : "Saturó el contexto de un subagente",
      cost: PENALTY.overloadPerSlot * over,
      text: `${LANE_NAME[lane]} lleva ${load} huecos y solo caben ${CAPACITY}: olvida parte de lo que sabía. ${isMain ? "Saca de ahí el trabajo que genera más ruido." : "Reparte su carga."}`,
    }];
  });
}

/** Decisions delegated away from the person, and dependent tasks launched in parallel. */
function delegationIssues(round: Round, assignment: Assignment): Issue[] {
  const textOf = (id: string) => round.tasks.find((task) => task.id === id)!.text;
  return round.tasks.flatMap((task) => {
    const issues: Issue[] = [];
    if (task.you && assignment[task.id] !== "main") {
      issues.push({
        tag: "Delegó una decisión que había que hablar con la persona", cost: PENALTY.delegatedDecision,
        text: `«${task.text}» está en un subagente, y un subagente no ve tu conversación ni puede preguntarte. Decidirá por su cuenta.`,
      });
    }
    if (task.after) {
      const previous = assignment[task.after], own = assignment[task.id];
      if (own !== "main" && previous !== "main" && previous !== own) {
        issues.push({
          tag: "Lanzó en paralelo dos tareas que dependían una de otra", cost: PENALTY.parallelDependency,
          text: `«${task.text}» necesita el resultado de «${textOf(task.after)}», pero están en subagentes distintos que trabajan a la vez: empieza sin ese resultado.`,
        });
      }
    }
    return issues;
  });
}

function sharedFileIssues(round: Round, assignment: Assignment): Issue[] {
  const issues: Issue[] = [];
  round.tasks.forEach((first, i) =>
    round.tasks.slice(i + 1).forEach((second) => {
      if (first.area && first.area === second.area && assignment[first.id] !== assignment[second.id]) {
        issues.push({
          tag: "Puso a dos agentes a editar el mismo fichero", cost: PENALTY.sharedFile,
          text: `Dos agentes editan ${first.area} a la vez («${first.text}» y «${second.text}»): se pisan los cambios.`,
        });
      }
    }),
  );
  return issues;
}

function trivialSubagentIssues(round: Round, assignment: Assignment): Issue[] {
  return SUBAGENTS.flatMap((lane) => {
    const own = tasksOf(round, assignment, lane);
    if (!own.length || taskLoad(own) > TRIVIAL_LOAD) return [];
    return [{
      tag: "Usó un subagente para una tarea mínima", cost: PENALTY.trivialSubagent,
      text: `${LANE_NAME[lane]} solo hace «${own[0].text}»: explicarle la tarea cuesta más que hacerla en el principal.`,
    }];
  });
}

/** Scores how a mission was split between the agents; every issue found subtracts its cost. */
export function evaluate(round: Round, assignment: Assignment): Evaluation {
  const issues = [
    ...overloadIssues(round, assignment),
    ...delegationIssues(round, assignment),
    ...sharedFileIssues(round, assignment),
    ...trivialSubagentIssues(round, assignment),
  ];
  return { score: Math.max(0, ROUND_MAX_SCORE - issues.reduce((sum, issue) => sum + issue.cost, 0)), issues };
}

/** Distinct mistake labels of an evaluation, for the session statistics. */
export const evaluationMistakes = (evaluation: Evaluation): string[] => [...new Set(evaluation.issues.map((issue) => issue.tag))];
