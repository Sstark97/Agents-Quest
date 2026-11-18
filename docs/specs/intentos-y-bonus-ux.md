# Intentos y bonus visibles antes de jugar

Estado: aprobada

## Problema

Con los intentos limitados y los bonus de rapidez (spec `intentos-y-bonus.md`), un equipo solo descubre cuántos intentos tiene cuando pulsa PRESS START: el aviso «INTENTO 1/2» dura un segundo y medio y ya está jugando. Tampoco sabe qué bonus hay en juego ni si quedan plazas, así que no puede decidir si ir rápido o asegurar la nota. Al terminar, REINTENTAR no dice que gasta un intento ni cuántos quedan.

## Resultado esperado

En la pantalla de inicio de cada nivel, donde están las reglas y la prueba, el equipo ve antes de empezar:

- cuántos intentos tiene, en cuál va y cuántos le quedan, siempre al día;
- que el intento se gasta al pulsar PRESS START aunque no termine, y que cuenta su mejor intento;
- qué bonus hay en juego (rapidez para los tres primeros con buena nota, primer pleno) y si quedan plazas;
- si ya tiene un bonus en ese nivel.

Al terminar, el diálogo de resultado dice cuántos intentos quedan y qué puntuación cuenta en el ranking. Sin intentos, no se ofrece REINTENTAR y se explica por qué.

## Alcance

- Dentro: panel «Reglas de la partida» en la intro de los 7 niveles; estado de intentos y bonus servido por el servidor y refrescado solo; diálogo de resultado con intentos restantes y puntuación que cuenta; REINICIAR del nivel 1 avisa de que gasta un intento; marcador de intentos por nivel en el mapa/lista de niveles del menú.
- Fuera: cambiar las reglas de intentos o de bonus; avisos sonoros; notificaciones push.
- Más adelante: modo práctica completo tras agotar intentos.

## Decisiones

- **Una consulta de solo lectura por equipo y sesión** (todos los niveles a la vez) que devuelve intentos usados, límite, mejor puntuación y estado de los bonus de cada nivel. La usan la intro, el resultado y el menú. No gasta intentos.
- **La verdad la tiene el servidor**: el número que se ve es el del servidor, no un contador local. Se refresca al entrar, tras reservar un intento, tras enviar una puntuación y cada pocos segundos mientras la intro está abierta (los bonus cambian con lo que hagan otros equipos).
- **Sin sesión, o sesión anterior a los intentos**: no se muestra el panel; todo queda como antes.
- **Sin conexión**: se muestra lo último conocido con «sin conexión», o nada si no hay dato; nunca bloquea el juego (las reglas offline de la spec anterior no cambian).
- **Los textos dicen las cifras reales** (límite de la sesión, umbral de buena nota del nivel y valores de bonus), sacadas de las constantes del dominio, no escritas a mano.

## Historias de usuario

### US-01 · Reglas de la partida en la intro del nivel · M

- [ ] Hecha

Como equipo, quiero ver antes de empezar cuántos intentos me quedan y qué bonus hay en juego para decidir cómo jugar.

Criterios de aceptación:

1. Dado una sesión con límite 2 y ningún intento gastado, cuando abro la intro de un nivel, entonces veo «INTENTOS: 0 de 2 usados · te quedan 2» con un marcador de 2 casillas, y el aviso «Se gasta un intento al pulsar PRESS START, aunque no termines. Cuenta tu mejor intento.»
2. Dado que ya gasté 1 de 2, entonces veo «te queda 1 · ¡último intento!» resaltado, y el botón dice «PRESS START · ÚLTIMO INTENTO».
3. Dado que gasté 2 de 2, entonces veo «Has agotado tus intentos en este nivel. Cuenta tu mejor puntuación: N» (o «sin puntuación» si no envié ninguna), PRESS START no aparece y se recuerda que la prueba de arriba se puede seguir usando porque no puntúa.
4. Dado el bloque «BONUS EN JUEGO», entonces veo «Rapidez: 1º +45 · 2º +30 · 3º +15 para los primeros en superarlo con 240 o más» y «Primer pleno (300): +30», cada uno con su estado al día: «Quedan 2 de 3 plazas» / «Plazas agotadas» y «Libre» / «Conseguido por <equipo>»; si el bonus es mío, «¡Lo tienes tú! +N».
5. Dado que otro equipo consigue una plaza mientras tengo la intro abierta, entonces el estado se actualiza solo en unos segundos, sin recargar.

Notas técnicas: regla de "estado de partida" pura en `src/domain/session` (con tests), que reutiliza `awardBonuses`, `bonusScore`, `ARRIVAL_BONUSES`, `FIRST_PERFECT_BONUS`; caso de uso de lectura y endpoint GET; servicio de cliente; componente en `src/ui`. No se toca ninguna clave `taller.*` ni `aq:*` existente.

### US-02 · Intentos en el resultado y en el menú · M

- [ ] Hecha

Como equipo, quiero saber al terminar cuántos intentos me quedan y qué puntuación cuenta, y ver en el menú en qué niveles me quedan intentos.

Criterios de aceptación:

1. Dado que termino mi intento 1 de 2, entonces el resultado dice «Te queda 1 intento» y el botón es «REINTENTAR (1 restante)».
2. Dado que termino mi último intento, entonces el resultado dice «No te quedan intentos en este nivel» y no hay botón REINTENTAR.
3. Dado que mi mejor intento anterior es mejor que este, entonces el resultado dice «En el ranking cuenta tu mejor intento: N».
4. Dado el REINICIAR dentro del nivel 1 en una sesión con límite, entonces el botón dice que gasta un intento y cuántos quedan, y no aparece si no quedan.
5. Dado el menú de niveles en una sesión con límite, entonces cada nivel abierto muestra sus intentos usados (p. ej. «1/2»), y «sin intentos» cuando están agotados.

Notas técnicas: reutiliza la consulta de US-01. Depende de: US-01.

## Plan

(Lo rellena `/next-iteration`.)
