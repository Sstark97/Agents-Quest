/** What each level leaves behind: the idea, how it applies with a real agent and a question to discuss in class. */
export type Lesson = { idea: string; real: string; ask: string };

export const LESSONS: Record<string, Lesson> = {
  "nivel-1": {
    idea: "Explorar, planificar y solo entonces ejecutar.",
    real: "Primero pregúntale por el código (Ask), después pídele un plan y revísalo (Plan), y dale permiso de edición cuando el plan te convenza (Agent).",
    ask: "¿Qué os costó más puntos: leer de más o ejecutar sin haber mirado?",
  },
  "nivel-2": {
    idea: "Un buen prompt no es más largo: está mejor estructurado.",
    real: "Antes de enviar una petición, comprueba tres cosas: que el objetivo dice cuándo está terminado, que señalas los ficheros exactos y que el agente tiene un punto donde enseñarte lo que hace.",
    ask: "¿Qué parte del prompt cambió más el resultado del robot?",
  },
  "nivel-3": {
    idea: "El contexto es pequeño, y lo que sobra degrada sin avisar.",
    real: "Dale al agente solo lo que la tarea necesita y empieza una conversación nueva cuando cambies de tarea: lo de antes sigue ocupando sitio aunque ya no sirva.",
    ask: "Si cada tarea necesita su propia mesa limpia, ¿por qué no usar un agente distinto para cada una?",
  },
  "nivel-4": {
    idea: "Una regla solo protege si es concreta y se puede comprobar.",
    real: "En tu AGENTS.md escribe pocas reglas, cada una sobre un comportamiento que puedas verificar. Si no puedes decir cuándo se ha incumplido, el agente tampoco.",
    ask: "¿Cómo distinguís una regla vaga de una concreta sin lanzar la oleada?",
  },
  "nivel-5": {
    idea: "No hay una herramienta mejor: hay un nivel de control adecuado a cada tarea.",
    real: "Antes de empezar, decide cuánto quieres mirar: cada línea (editor), cada cambio (IDE) o solo el resultado (CLI). Cuanta más autonomía das, más claro tiene que estar el objetivo.",
    ask: "¿Qué tarea os hizo dudar entre dos raíles, y por qué?",
  },
  "nivel-6": {
    idea: "Un subagente es una mesa limpia: úsalo para aislar ruido y trabajar en paralelo.",
    real: "Delega lo que genera mucho ruido (búsquedas, logs) o lo que no depende de otra cosa. Escríbele todo lo que necesita saber, porque no ve tu conversación, y no pongas a dos agentes a editar el mismo fichero.",
    ask: "¿Qué tarea no se podía delegar, y por qué?",
  },
  "nivel-7": {
    idea: "Los conceptos no van por separado: cada tarea real los usa todos.",
    real: "Antes de lanzar un agente, repasa: en qué modo empiezo, con qué herramienta, qué le pido, qué contexto le doy, qué reglas tiene y qué puedo delegar.",
    ask: "¿Cuál de las seis decisiones tomáis hoy sin pensar, y cuál os cuesta más?",
  },
};
