export type Tool = "editor" | "ide" | "cli";

export const TOOL_IDS: Tool[] = ["editor", "ide", "cli"];

export const TOOLS: Record<Tool, { name: string; control: string }> = {
  editor: { name: "ASISTENTE EN EDITOR", control: "Tú decides cada línea" },
  ide: { name: "AGENTE EN IDE", control: "Tú revisas cada diff" },
  cli: { name: "AGENTE CLI", control: "Tú fijas el objetivo y revisas el resultado" },
};

export type Card = { text: string; tool: Tool; why: string };

export const CARDS: Card[] = [
  { text: "Autocompletar la siguiente línea mientras escribes.", tool: "editor", why: "Sugerencias en línea: tú tecleas y aceptas o descartas cada una." },
  { text: "Preguntar qué hace esta función que acabas de heredar.", tool: "editor", why: "Consulta puntual dentro del editor, sin tocar ficheros." },
  { text: "Renombrar una variable dentro de un fichero.", tool: "editor", why: "Cambio pequeño y local: no hace falta un agente." },
  { text: "Escribir el comentario de documentación de una función.", tool: "editor", why: "Tarea acotada que controlas línea a línea." },
  { text: "Cambiar la firma de un método y adaptar sus 6 usos, revisando cada diff.", tool: "ide", why: "Varios ficheros, pero con tus ojos en cada cambio dentro del IDE." },
  { text: "Implementar un endpoint nuevo (controlador, servicio y tests) viendo los cambios.", tool: "ide", why: "El agente edita varios ficheros y tú supervisas los diffs." },
  { text: "Pedir que arregle un test que falla y revisar el diff antes de aceptar.", tool: "ide", why: "El agente actúa y tú apruebas los cambios antes de aceptarlos." },
  { text: "Lanzar en la terminal una migración larga y volver cuando termine.", tool: "cli", why: "Tarea larga y autónoma: defines el objetivo y revisas el resultado." },
  { text: "Dos agentes trabajando en paralelo en ramas distintas.", tool: "cli", why: "La ejecución en paralelo y sin pantalla es lo propio del agente en CLI." },
  { text: "Ejecutar un agente desde CI cada noche para generar un informe.", tool: "cli", why: "Sin persona delante: solo encaja un agente que corre por su cuenta." },
];

export const POINTS_PER_CARD = 30;
export const MAX_SCORE = CARDS.length * POINTS_PER_CARD;

export const isRightTool = (card: Card, tool: Tool) => card.tool === tool;
export const scoreFor = (correctCards: number) => correctCards * POINTS_PER_CARD;
export const missMistake = (card: Card) => `Falló: «${card.text}»`;
