# Intentos limitados y bonus de rapidez

Estado: aprobada

## Problema

En la primera sesión del taller los equipos reintentaron cada nivel hasta sacar la puntuación máxima, así que el ranking dejó de distinguir a quien lo hacía bien a la primera de quien lo repetía diez veces. Además el ranking solo guarda la mejor nota: no sabe cuándo terminó cada equipo, así que no se puede premiar a los primeros.

## Resultado esperado

- El formador decide cuántos intentos tiene cada equipo por nivel (por defecto 2) y el servidor lo hace cumplir.
- Los tres primeros equipos que superan un nivel con buena nota ganan un bonus de rapidez, y el primero en sacar el máximo gana un bonus extra.
- A igual total, va primero quien terminó antes.
- Cada equipo (y el proyector) ve de dónde sale su puntuación: base + bonus.

## Alcance

- Dentro: límite de intentos por sesión (global, no por nivel), contado al empezar el nivel; bonus por orden de llegada; bonus "primer pleno"; desempate por hora de llegada; desglose en ranking y proyector; ajuste en el panel del formador.
- Fuera: cuentas de usuario (el equipo sigue identificándose por su nombre); bonus por tiempo desde la apertura del nivel; medallas que suman puntos; botón "cerrar nivel"; recalcular sesiones ya jugadas.
- Más adelante: límite distinto por nivel; práctica sin puntuar cuando se agotan los intentos (hoy el reintento solo funciona en local).

## Decisiones

- **Puntuación base = mejor de los intentos permitidos.** Mantiene el contrato actual (`best score`) y no castiga un mal primer intento. Alternativa descartada: solo cuenta el primero (más duro, la gente se frustra).
- **El intento se cuenta al empezar, no al terminar.** Si no, recargar la página para evitar un mal resultado sería gratis.
- **Orden y bonus los decide el servidor** con su propio reloj; el cliente nunca envía una hora.
- **Los bonus solo se conceden con ≥ 80 % de la puntuación máxima del nivel**, para que enviar deprisa y mal no compense.
- **Bonus de orden de llegada:** 1.º +45, 2.º +30, 3.º +15 (al superar el umbral). **Primer pleno:** +30 al primer equipo que consigue la puntuación máxima. Valores como constantes con nombre en el dominio.
- **El bonus se guarda aparte de la puntuación base**, de modo que la validación `score ≤ maxScore` sigue intacta y se puede mostrar el desglose.
- **Sin límite de intentos no hay bonus justo**: ambos cambios van juntos.

## Supuestos

- Sesiones ya existentes (p. ej. la del miércoles) no tienen datos de intentos ni de hora: se tratan como "sin límite" (límite por defecto no aplicado) y sin bonus, no se recalculan.
- El equipo se identifica por nombre; quien se una con otro nombre empieza de cero. Es aceptable para un taller.
- El límite se fija al crear la sesión y el formador puede cambiarlo después; cambiarlo no borra intentos ya consumidos.

## Historias de usuario

### US-01 · Límite de intentos por nivel · M

- [ ] Hecha

Como formador, quiero fijar cuántos intentos tiene cada equipo por nivel para que el ranking premie hacerlo bien y no insistir.

Criterios de aceptación:

1. Dado una sesión con límite 2, cuando un equipo empieza un nivel por tercera vez, entonces el servidor lo rechaza y el equipo ve «Has agotado tus intentos en este nivel».
2. Dado un equipo con intentos disponibles, cuando empieza un nivel, entonces ve «Intento 1/2» antes de jugar y el servidor lo cuenta aunque cierre la pestaña sin terminar.
3. Dado un equipo con dos intentos hechos de 2, cuando envía puntuación, entonces el ranking guarda la mejor de las dos.
4. Dado el panel del formador, cuando cambia el límite (1–5), entonces se aplica a los intentos siguientes sin borrar los ya consumidos.
5. Dada una sesión sin dato de límite (anterior al cambio), entonces no se aplica ningún límite.

Notas técnicas: regla de intentos en `src/domain/session`; contador en `ScoreRepository` (o puerto nuevo si el arquitecto lo justifica) con clave nueva `aq:*`; nuevo caso de uso en `application/server`; endpoint en `app/api` con mensajes en `responses.ts`; servicio de cliente para reservar el intento. Depende de: nada.

### US-02 · Bonus de rapidez y primer pleno · M

- [ ] Hecha

Como equipo, quiero un extra por terminar antes y bien para que ser rápido y acertar cuente en el ranking.

Criterios de aceptación:

1. Dado un nivel con puntuación máxima 300, cuando los tres primeros equipos lo superan con ≥ 240, entonces reciben +45, +30 y +15 por orden de llegada del servidor.
2. Dado un equipo que supera el nivel con < 240, entonces no recibe bonus de llegada ni ocupa uno de los tres puestos.
3. Dado el primer equipo que consigue 300, entonces recibe además +30 («Primer pleno»); los siguientes no.
4. Dado un equipo que mejora su nota más tarde, entonces el bonus ya concedido no cambia ni se concede dos veces.
5. Dado el ranking, el total de cada equipo es la suma de bases y bonus.

Notas técnicas: cálculo del bonus en `src/domain/session` (puro, con tests); el servidor guarda la hora de llegada de cada resultado válido; la puntuación enviada sigue limitada a `maxScore`. Depende de: US-01 (para que el reintento no anule el sentido del bonus).

### US-03 · Desempate y desglose visible · S

- [ ] Hecha

Como equipo y como formador, quiero ver de dónde sale cada puntuación y quién gana un empate para entender el ranking.

Criterios de aceptación:

1. Dado dos equipos con el mismo total, entonces va primero el que llegó antes.
2. Dado el ranking y el proyector, entonces cada equipo muestra «Base N + Rapidez N + Primer pleno N» cuando haya bonus.
3. Dado el resultado de un nivel, cuando hay bonus, entonces el equipo ve el bonus que ha ganado.
4. Dado el primer pleno de un nivel, entonces el proyector lo anuncia con el nombre del equipo.

Notas técnicas: orden en `buildRanking` (dominio); sin cambios en los ids de nivel ni en los `taller.*`. Depende de: US-02.

## Limitaciones conocidas

- Si la respuesta de un inicio de intento se pierde (el servidor lo contó pero el equipo no lo supo), el reintento desde la cola lo cuenta otra vez y el equipo gasta un intento de más. Es poco frecuente; el formador puede subir el límite desde el panel sin borrar los intentos ya consumidos.

## Plan

(Lo rellena `/next-iteration`.)
