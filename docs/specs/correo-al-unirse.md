# Correo opcional al unirse a una sesión

Estado: aprobada

## Problema

LeanMind quiere recoger correos de quienes participan en los talleres para enviarles comunicaciones, pero no en todas las sesiones ni de forma obligatoria. Hoy el juego no pide ningún dato personal: solo código de sesión, nombre de equipo y robot.

## Resultado esperado

- El formador decide, sesión a sesión, si se pide correo. Por defecto no se pide.
- Si está activado, al unirse el equipo ve un campo de correo **opcional**, una casilla de consentimiento sin marcar y un enlace «¿Para qué lo pedimos?» que abre un popup con la información básica de protección de datos y el enlace a la política de privacidad.
- El correo se valida como correo (en el navegador y en el servidor).
- El formador ve cuántos correos se han recogido y los descarga en CSV desde su panel.

## Alcance

- Dentro: opción por sesión (al crearla y en el panel); paso de correo al unirse; popup informativo; validación; guardado con prueba del consentimiento; recuento y descarga CSV para el formador; aviso opcional a los equipos que ya estaban unidos cuando se activa.
- Fuera: doble confirmación por correo (lo hará la herramienta de mailing de LeanMind al importar); varios correos por equipo; editar o borrar el correo desde el juego (los derechos se ejercen ante LeanMind según su política).
- Más adelante: borrar los correos de una sesión desde el panel sin borrar la sesión.

## Decisiones

- **Un correo por equipo** (un dispositivo por equipo). Si el equipo lo envía otra vez, se guarda el último.
- **Opcional siempre**: se puede jugar sin dejar el correo. Si se escribe un correo, la casilla de consentimiento es obligatoria para enviarlo.
- **Finalidad**: la de la política actual de LeanMind (newsletters y comunicaciones comerciales sobre promociones y publicidad de la empresa y del sector). Legitimación: consentimiento.
- **Prueba del consentimiento**: con cada correo se guarda la fecha y hora del servidor y la versión del texto aceptado (constante con nombre en el dominio).
- **Conservación en el juego**: los correos viven con la sesión y caducan con ella (30 días). Borrar la sesión los borra; «reiniciar puntuaciones» **no** los borra. El formador debe descargarlos antes.
- **Privacidad técnica**: el correo no se guarda en el dispositivo (`localStorage`), nunca aparece en ranking, proyector, estado de partida ni ninguna respuesta pública, y no se escribe en logs. Solo se exporta con la clave de formador.
- **Popup** («¿Para qué lo pedimos?»), primera capa de información:
  - Responsable: Lean Mind, S.L.
  - Finalidad: enviarte newsletters y comunicaciones comerciales sobre promociones y novedades de LeanMind y del sector.
  - Legitimación: tu consentimiento, al marcar la casilla. Es opcional: puedes jugar igual sin dejar tu correo.
  - Conservación: el juego lo borra con la sesión (30 días); LeanMind lo conserva mientras no pidas la baja.
  - Derechos: acceso, rectificación, supresión, oposición y retirada del consentimiento en cualquier momento, como indica la política.
  - Enlace: «Política de privacidad completa» → `https://leanmind.es/es/politica-privacidad` (nueva pestaña).

## Supuestos

- LeanMind confirma que su política cubre este tratamiento (hoy no menciona talleres) y qué correo de contacto es el bueno; el popup remite a la política para ejercer derechos y no cita ningún correo.
- Participantes mayores de 14 años (universidad).

## Historias de usuario

### US-01 · El formador activa la recogida de correos · M

- [x] Hecha

Como formador, quiero activar o desactivar por sesión que se pida correo para recogerlo solo cuando LeanMind lo necesite.

Criterios de aceptación:

1. Dado el formulario de nueva sesión, entonces hay una opción «Pedir correo al unirse (opcional para los equipos)» desmarcada por defecto.
2. Dado el panel de una sesión, cuando cambio la opción, entonces se aplica a los equipos que se unan después.
3. Dada una sesión creada antes de este cambio, entonces no pide correo.

### US-02 · El equipo deja su correo al unirse · M

- [x] Hecha

Como equipo, quiero dejar mi correo si quiero, sabiendo para qué se usa.

Criterios de aceptación:

1. Dada una sesión sin correo, cuando pulso UNIRME, entonces me uno como hoy, sin paso extra.
2. Dada una sesión con correo, cuando pulso UNIRME, entonces veo «Correo (opcional)», la casilla «Acepto que Lean Mind, S.L. use mi correo para enviarme newsletters y comunicaciones comerciales. Puedo darme de baja cuando quiera.» sin marcar, el enlace «¿Para qué lo pedimos?» y los botones «UNIRME CON CORREO» y «UNIRME SIN CORREO».
3. Dado un correo mal escrito, entonces veo «Escribe un correo válido» y no se envía; dado un correo válido sin la casilla marcada, entonces veo «Marca la casilla para poder guardar tu correo».
4. Dado «¿Para qué lo pedimos?», entonces se abre un popup con la información de la sección Decisiones y el enlace a la política; se cierra con un botón y con Escape.
5. Dado un correo válido con consentimiento, entonces queda guardado para la sesión con fecha y versión del texto, y el equipo entra en la sesión; si no hay conexión, se une igualmente y se le avisa de que el correo no se ha guardado.

### US-03 · Equipos ya unidos y descarga para el formador · M

- [x] Hecha

Como formador, quiero ver cuántos correos tengo y descargarlos; y que los equipos que ya estaban dentro puedan dejarlo si activo la opción a mitad.

Criterios de aceptación:

1. Dado el panel de una sesión con la opción activa, entonces veo «Correos recogidos: N» y un botón «DESCARGAR CSV» que baja `correos-<CÓDIGO>.csv` con columnas equipo, correo, fecha de consentimiento y versión del texto.
2. Dada una petición de descarga sin la clave de formador correcta, entonces se rechaza.
3. Dado un equipo ya unido a una sesión que activa la opción, entonces su tarjeta de sesión muestra una vez «¿Quieres dejar tu correo? (opcional)» con el mismo formulario y popup; puede cerrarlo con «Ahora no» y no vuelve a salir en ese dispositivo.
4. Dado el ranking, el proyector o cualquier respuesta pública, entonces nunca incluyen correos.

## Limitaciones conocidas

- Sin clave, quien conozca el código de una sesión que recoge correos puede enviar uno a nombre de cualquier equipo (el último gana) o añadir direcciones con consentimiento declarado por el cliente. Es inherente a que los equipos se unan solo con el código; LeanMind debe tratar la lista como declarada por los participantes. Mitigación posible más adelante: aceptar solo equipos que hayan puntuado o limitar los registros por sesión.
- Un equipo que ya estaba en la página ve la pregunta al volver a la pestaña, no al instante en que el formador activa la opción.

## Plan

(Lo rellena `/next-iteration`.)
