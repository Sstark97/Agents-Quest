/** Unlockable glossary: every passed level opens its cards. */
export type Entry = { term: string; def: string; eg: string };

export const GLOSSARY: Record<string, Entry[]> = {
  "nivel-1": [
    { term: "Modos Ask · Plan · Agent", def: "Tres niveles de permiso. Ask solo lee y responde, Plan propone los pasos sin tocar nada y Agent edita y ejecuta.", eg: "«Explícame cómo funciona el login» (Ask) → «Propón un plan para añadir 2FA» (Plan) → «Adelante con el plan» (Agent)." },
    { term: "Permisos", def: "Lo que el agente puede hacer sin preguntarte: leer, editar ficheros, lanzar comandos. Cuanto más permiso, más importa haber mirado antes.", eg: "Dejarle ejecutar los tests sin preguntar, pero pedir confirmación antes de borrar ficheros." },
  ],
  "nivel-2": [
    { term: "Prompt", def: "La petición que le haces al agente. Funciona mejor con tres partes: objetivo, referencias y forma de trabajar.", eg: "«Añade paginación a GET /users (objetivo). Mira users.controller.ts (referencia). Test primero y enséñame el diff (workflow).»" },
    { term: "Criterio de llegada", def: "La parte del objetivo que dice cuándo está terminado. Sin él, el agente decide por su cuenta qué significa «hecho».", eg: "«…de forma que devuelva 20 usuarios por página y el total en la cabecera X-Total.»" },
    { term: "Punto de control", def: "Un momento en el que el agente para y te enseña lo que lleva, antes de seguir.", eg: "«Propón un plan y espera mi OK», «enséñame el diff antes del commit»." },
  ],
  "nivel-3": [
    { term: "Ventana de contexto", def: "Todo lo que el agente tiene delante en una conversación: tus mensajes, los ficheros que ha leído y sus propias respuestas. Es limitada.", eg: "Tras leer veinte ficheros grandes, el agente empieza a olvidar lo que le dijiste al principio." },
    { term: "Ruido de contexto", def: "Información que está en la conversación pero no sirve para la tarea. No da error: ocupa sitio y empeora las respuestas.", eg: "El log completo de ayer cuando solo hacía falta una traza de error." },
    { term: "Limpiar el contexto", def: "Empezar una conversación nueva (o vaciar la actual) al cambiar de tarea, llevándote solo lo necesario.", eg: "Acabas el arreglo del IVA y abres una conversación nueva para el login." },
  ],
  "nivel-4": [
    { term: "AGENTS.md", def: "Fichero en la raíz del repositorio con las normas del proyecto. El agente lo lee al empezar cada tarea.", eg: "Comandos para lanzar los tests, convenciones de ramas y lo que nunca debe hacer." },
    { term: "Regla verificable", def: "Una norma que dice un comportamiento concreto y permite comprobar si se ha cumplido.", eg: "«Nunca hagas commit en main» frente a «sigue buenas prácticas de Git»." },
  ],
  "nivel-5": [
    { term: "Espectro de autonomía", def: "De menos a más autonomía: asistente en el editor (decides cada línea), agente en el IDE (revisas cada cambio) y agente en la terminal (revisas el resultado).", eg: "Renombrar una variable → editor. Un endpoint con tests → IDE. Una migración larga → terminal." },
    { term: "Diff", def: "La lista de líneas que el agente ha añadido y quitado. Es lo que revisas antes de aceptar un cambio.", eg: "Un diff de 3 ficheros se revisa bien; uno de 60 ficheros, no." },
  ],
  "nivel-6": [
    { term: "Subagente", def: "Un agente que el principal lanza para una tarea concreta. Tiene su propio contexto, no ve tu conversación y devuelve solo un resumen.", eg: "Un subagente lee 2.000 líneas de logs y contesta: «el cuello de botella está en la consulta de pedidos»." },
    { term: "Orquestador", def: "El agente principal cuando reparte trabajo: decide qué delega, escribe las instrucciones de cada subagente y junta los resultados.", eg: "Reparte la migración de dos módulos independientes entre dos subagentes y revisa ambos resúmenes." },
    { term: "Trabajo en paralelo", def: "Varios agentes a la vez. Solo funciona si las tareas no dependen unas de otras ni tocan los mismos ficheros.", eg: "Sí: migrar usuarios y migrar pedidos. No: implementar un servicio y, a la vez, escribir sus tests en otro agente." },
  ],
  "nivel-7": [
    { term: "Las seis preguntas", def: "Lo que conviene decidir antes de lanzar un agente: modo, herramienta, petición, contexto, reglas y qué se delega.", eg: "Para un fallo de una línea: Ask para localizarlo, el editor, un prompt con el test, conversación nueva, la regla de no desplegar y nada que delegar." },
  ],
};
