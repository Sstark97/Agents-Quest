export type StageOption = { text: string; ok?: boolean; why: string };
export type Stage = { kind: string; level: number; ask: string; options: StageOption[] };
export type Mission = { title: string; stages: Stage[] };

export const POINTS = 50;
export const LIVES = 3;

/** Two equivalent missions (each team gets one). Every stage reviews the concept of one level. */
export const MISSIONS: Mission[] = [
  {
    title: "Añadir la exportación a CSV del listado de pedidos, en un repositorio que no conoces.",
    stages: [
      { kind: "MODO", level: 1, ask: "Acabas de abrir el repositorio. ¿Por dónde empiezas?", options: [
        { ok: true, text: "Ask: que te explique cómo se genera hoy el listado, sin tocar nada.", why: "Primero se explora: sin saber cómo está hecho, cualquier plan es a ciegas." },
        { text: "Agent: que lo implemente ya; si rompe algo, se arregla después.", why: "Ejecutar sin haber mirado es improvisar sobre código real." },
        { text: "Plan: que proponga un plan antes de haber leído el código.", why: "Un plan hecho sin leer el código se apoya en suposiciones." },
      ] },
      { kind: "HERRAMIENTA", level: 5, ask: "El cambio toca controlador, servicio y tests, y quieres ver cada cambio antes de aceptarlo.", options: [
        { ok: true, text: "Agente en el IDE, revisando cada diff.", why: "Varios ficheros con tus ojos en cada cambio: es el término medio." },
        { text: "Autocompletado en el editor, línea a línea.", why: "Para tres ficheros coordinados se queda corto: lo harías casi todo a mano." },
        { text: "Agente en la terminal, trabajando solo toda la noche.", why: "Demasiada autonomía si quieres revisar cada cambio." },
      ] },
      { kind: "PROMPT", level: 2, ask: "¿Qué le pides?", options: [
        { ok: true, text: "Añade GET /orders/export que devuelva un CSV con id, fecha y total, sin cambiar GET /orders. Sigue el patrón de orders.controller.ts. Test primero y enséñame el diff.", why: "Objetivo con criterio de llegada, referencia concreta y un punto de control." },
        { text: "Haz que se puedan exportar los pedidos.", why: "¿A qué formato? ¿Qué campos? ¿Desde dónde? Tiene que adivinarlo todo." },
        { text: "Eres un experto en CSV. Exporta los pedidos lo mejor que sepas y sorpréndeme.", why: "Halagos y libertad total no sustituyen a un objetivo concreto." },
      ] },
      { kind: "CONTEXTO", level: 3, ask: "¿Con qué información le dejas trabajar?", options: [
        { ok: true, text: "orders.controller.ts, orders.service.ts y su fichero de tests.", why: "Justo lo que la tarea necesita, sin ruido." },
        { text: "Todo el repositorio y el log de producción de ayer, por si acaso.", why: "Lo que sobra no da error: ocupa sitio y degrada las respuestas." },
        { text: "Nada: que lo busque todo él.", why: "Gastará buena parte del contexto explorando antes de empezar." },
      ] },
      { kind: "REGLAS", level: 4, ask: "El agente ha reformateado 40 ficheros que no tenían que ver con la tarea. ¿Qué regla lo habría frenado?", options: [
        { ok: true, text: "Modifica solo los ficheros de la tarea; no reformatees el resto.", why: "Dice qué hacer y se puede comprobar mirando el diff." },
        { text: "Sé cuidadoso con los cambios.", why: "¿Cuidadoso cómo? Nadie puede decir si se ha cumplido." },
        { text: "Escribe código limpio y profesional.", why: "Precisamente por «limpiar» ha reformateado los 40 ficheros." },
      ] },
      { kind: "SUBAGENTES", level: 6, ask: "Falta revisar 2.000 líneas de logs para saber si la exportación es lenta.", options: [
        { ok: true, text: "Delegarlo en un subagente: lee los logs en su contexto y te devuelve un resumen.", why: "El ruido se queda en su mesa y a la tuya solo llega la conclusión." },
        { text: "Pegar los logs enteros en la conversación principal.", why: "Llenas el contexto principal de ruido para el resto de la tarea." },
        { text: "Lanzar dos subagentes a editar orders.service.ts a la vez para ir más rápido.", why: "Dos agentes sobre el mismo fichero se pisan los cambios." },
      ] },
    ],
  },
  {
    title: "Arreglar un fallo: el total del carrito sale mal cuando hay descuentos.",
    stages: [
      { kind: "MODO", level: 1, ask: "El fallo está reportado, pero no sabes dónde está. ¿Qué haces primero?", options: [
        { ok: true, text: "Ask: que localice dónde se calcula el total y te lo explique.", why: "Antes de cambiar nada hay que saber dónde está el problema." },
        { text: "Agent: «arregla el bug del carrito».", why: "Sin haber mirado, tocará lo primero que le parezca sospechoso." },
        { text: "Plan: aprobar el primer plan que proponga sin leerlo.", why: "Un plan que nadie revisa no es un punto de control." },
      ] },
      { kind: "HERRAMIENTA", level: 5, ask: "Resulta ser un cambio de una línea en una función que ya tienes abierta.", options: [
        { ok: true, text: "El asistente del editor, ahí mismo.", why: "Cambio pequeño y local: controlas la línea tú." },
        { text: "Un agente en la terminal con permisos completos.", why: "Demasiada autonomía para una sola línea." },
        { text: "Tres agentes en paralelo, uno por hipótesis.", why: "Coordinar tres agentes cuesta más que el arreglo." },
      ] },
      { kind: "PROMPT", level: 2, ask: "¿Qué le pides?", options: [
        { ok: true, text: "En cart.service.ts, calcTotal aplica el descuento después del IVA y debe aplicarlo antes. Añade un test que falle con un 10 % de descuento y arréglalo sin tocar otros cálculos.", why: "Dice qué está mal, cómo debe quedar, cómo comprobarlo y qué no tocar." },
        { text: "El carrito está mal, arréglalo.", why: "No dice qué está mal ni cuándo estará bien." },
        { text: "Revisa todo el módulo del carrito y mejora lo que veas.", why: "«Mejorar» es una dirección, no un destino: cambiará cosas que no pediste." },
      ] },
      { kind: "CONTEXTO", level: 3, ask: "Llevas una hora con otra tarea en esta misma conversación.", options: [
        { ok: true, text: "Empezar una conversación nueva solo con cart.service.ts y su test.", why: "Mesa limpia: lo de la tarea anterior ya solo estorba." },
        { text: "Seguir en la misma: así recuerda todo lo anterior.", why: "Lo anterior no ayuda a esta tarea y sigue ocupando sitio." },
        { text: "Añadir además el historial de commits del último año.", why: "Más contexto no es mejor contexto: es más ruido." },
      ] },
      { kind: "REGLAS", level: 4, ask: "El agente ha desplegado el arreglo directamente en producción. ¿Qué regla lo habría frenado?", options: [
        { ok: true, text: "Nunca despliegues: deja el cambio en una rama y avisa.", why: "Concreta y verificable: o hay despliegue o no lo hay." },
        { text: "Actúa con responsabilidad.", why: "Cada uno entiende una cosa distinta por «responsabilidad»." },
        { text: "Eres un ingeniero sénior con 20 años de experiencia.", why: "Describe un personaje, no un comportamiento." },
      ] },
      { kind: "SUBAGENTES", level: 6, ask: "Quieres saber si el mismo fallo está en otros 30 servicios.", options: [
        { ok: true, text: "Un subagente explorador que los revise y devuelva solo la lista de afectados.", why: "Mucha lectura en su contexto y una lista corta en el tuyo." },
        { text: "Abrir los 30 ficheros en la conversación principal.", why: "Saturas tu contexto antes de arreglar nada." },
        { text: "Un subagente sin instrucciones: ya sabrá qué buscar porque ve tu conversación.", why: "Un subagente no ve tu conversación: solo sabe lo que le escribes." },
      ] },
    ],
  },
];

export const missionFor = (seed: number): Mission => MISSIONS[seed % MISSIONS.length];
export const scoreFor = (hits: number) => hits * POINTS;
export const maxScore = (mission: Mission) => mission.stages.length * POINTS;
export const livesLeft = (misses: number) => LIVES - misses;
export const rightOption = (stage: Stage) => stage.options.find((option) => option.ok)!;
/** The mission ends after its last stage or when the lives run out. */
export const isMissionOver = (mission: Mission, stageIndex: number, misses: number) =>
  stageIndex + 1 >= mission.stages.length || livesLeft(misses) <= 0;
export const missMistake = (stageKind: string) => `Falló la decisión de ${stageKind}`;
