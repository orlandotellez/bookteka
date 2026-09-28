# 07 — Decisiones arquitectónicas

Registro de decisiones que el código ya toma. Cada una está con la evidencia que la forzó en el repositorio, no con intención.

---

## D-01 — JWT propio en lugar de una librería de auth

**Contexto.** El esquema tiene tablas `session`, `account` y `verification`, que son la forma de un producto de auth anterior.

**Decisión.** `src/modules/auth/application/auth.service.ts` implementa el auth a mano: firma JWT con `jsonwebtoken`, hash con `bcrypt`, y cookies HTTP-only. El refresh token se persiste en `session` y rota en cada uso.

**Evidencia en el código.** Las migraciones `20260801000000_add_jwt_auth` y `20260802020000_normalize_legacy_auth` adaptan las tablas heredadas al flujo actual: renombran `provider_id` de `credential` a `credentials` y borran las sesiones cuyo token no tiene forma de JWT.

**Alternativas consideradas.** Dejar el auth heredado; usar una librería como Better Auth o Auth.js.

**Consecuencias.** Control total del formato del token y de la rotación, a cambio de mantener criptografía y manejo de sesión a mano. El `account.password` no se usa con hash dedicado: es la columna `password` de `account` con `provider_id = "credentials"`.

---

## D-02 — Transporte de sesión dual (cookies + headers)

**Contexto.** La app corre en tres plataformas. En web el navegador manda cookies; en la WebView de Android la app llama a la API por IP de la red local, o sea cross-site, y la cookie `SameSite=Lax` no viaja.

**Decisión.** El mismo token se acepta por cuatro vías: cookie `httpOnly`, `Authorization: Bearer`, `x-session-token` y `x-refresh-token`. El frontend guarda los tokens en `localStorage` y los manda por header.

**Evidencia en el código.** `src/modules/auth/application/auth.service.ts` (`tokenFromHeaders` prioriza Bearer → header → cookie); `frontend/vite.config.ts` documenta en un comentario largo por qué el proxy `/api` de Vite existe; `frontend/src/lib/sessionToken.ts`; la lista de headers permitidos en `src/config/cors.ts`.

**Alternativas consideradas.** Solo cookies (rompe Android); solo headers (rompe web y deja el token accesible a JavaScript).

**Consecuencias.** Más superficie que mantener, y cuatro caminos que pueden divergir si alguien los cambia a medias. Regla explícita del proyecto: **los cuatro tienen que seguir funcionando**. Coste de seguridad: los tokens en `localStorage` son accesibles a XSS, mitigated parcialmente por `helmet`.

---

## D-03 — Deduplicación de PDFs por hash de contenido

**Contexto.** Bookteka es una biblioteca personal pero el almacenamiento no lo es. Si cinco personas suben el mismo PDF, tener cinco copias es desperdicio.

**Decisión.** Se hashea el contenido con SHA-256 y se usa `book.fileHash` con `@unique` como clave. Si el hash ya existe, no se sube el archivo: se reutiliza la fila y el objeto de R2.

**Evidencia en el código.** `book.fileHash String @unique` en `prisma/schema.prisma`; `src/modules/books/application/common/books.utils.ts` — `generateFileHash`; `src/modules/books/application/books.service.ts` — `uploadBook` busca por hash antes de subir.

**Alternativas consideradas.** Un `book` por usuario (sin dedup, duplica almacenamiento); hashear nombre + tamaño (colisiona al cambiar contenido).

**Consecuencias.** Ahorro de espacio real. El costo es que borrar exige saber quién más usa el libro: `countOtherUsers` decide si el objeto de R2 se elimina o se conserva.

---

## D-04 — Borrado cooperativo del archivo

**Contexto.** Con deduplicación, un `book` puede pertenecer a muchos `user_book`. Borrar en cascada rompería la biblioteca de los demás.

**Decisión.** Al eliminar un libro se borra siempre el `user_book` del usuario. El objeto de R2 y la fila `book` solo se borran si `countOtherUsers(bookId, userId) === 0`. Cada borrado deja un registro en `audit_log`.

**Evidencia en el código.** `src/modules/books/application/books.service.ts` — `deleteBook`; el `if (otherUsers === 0)` que rodea tanto el borrado de R2 como el de la fila; la transacción que escribe la auditoría y borra las filas.

**Alternativas consideradas.** Borrado en cascada automático (rompe libros compartidos); no borrar nunca (fuga de almacenamiento).

**Consecuencias.** Un archivo puede quedar huérfano en R2 si el conteo falla; `deleteR2Quietly` prefiere eso a dejar una fila colgada y lo loguea.

---

## D-05 — Solo el access token es stateless

**Contexto.** Guardar el access token en la base de datos en cada request agrega una lectura por request. No hacerlo significa que un logout no lo invalida al instante.

**Decisión.** El access token no se persiste: se verifica firmando. El refresh token sí se persiste en `session`, lo que permite revocación real.

**Evidencia en el código.** `findUserByAccessToken` solo verifica la firma y busca el usuario; `getSession` devuelve el mismo JWT como `session.token` con un id sintético `access:{jti|userId}`.

**Alternativas consideradas.** Persistir ambos tokens; sessions en Redis.

**Consecuencias.** Menos carga en la base de datos y revoked tokens con ventana de hasta 15 minutos. Es un compromiso consciente, no un descuido.

---

## D-06 — Refresh token de un solo uso (compare-and-delete)

**Contexto.** Si un refresh token se puede reutilizar, un token robado sirve indefinidamente hasta que expire. Y si dos requests válidos llegan juntos, ambos podrían crear sesiones.

**Decisión.** El refresh se hace con `deleteMany({ where: { id, token } })` dentro de una transacción. Si `count !== 1`, es que otro request ya lo consumió y se responde 401.

**Evidencia en el código.** `src/modules/auth/application/auth.service.ts` — `refresh()`: borra, verifica el conteo y emite los tokens nuevos en la misma transacción.

**Consecuencias.** Un refresh paralelo hace que una de las dos requests falle con 401. Es intencional: el cliente reintenta con el token nuevo.

---

## D-07 — Caché local en el dispositivo, nube como fuente de verdad

**Contexto.** Una app de lectura se usa en tren y en avión. Y leer en dos dispositivos no puede perder progreso en ninguno.

**Decisión.** Los libros, el texto extraído y el progreso viven en IndexedDB. Cuando hay sesión, se sincroniza contra la API y el merge toma **siempre el mayor valor** de cada campo de progreso. El texto y el blob nunca se sobrescriben con datos del servidor.

**Evidencia en el código.** `frontend/src/database/sync.ts` — los `Math.max` uno por uno; `frontend/src/store/streakStore.ts` — el cloud primero con fallback local; `bookStore.updateReadingTime` agenda el PATCH **antes** del `await` local.

**Alternativas consideradas.** Nube como única fuente (rompe offline); local como fuente de verdad (rompe el segundo dispositivo).

**Consecuencias.** El progreso nunca retrocede, pero tampoco se puede "deshacer" un tiempo de lectura alto desde otro dispositivo. El modelo asume un usuario por dispositivo: `clearDatabase()` borra todo, no por usuario.

---

## D-08 — Agrupar los PATCH de progreso

**Contexto.** El lector reporta scroll y tiempo de lectura de forma continua. Un request por evento saturaría el rate limit y la base de datos.

**Decisión.** Un coalescer por libro acumula los campos pendientes durante 3 segundos y envía un solo `PATCH`. Al cerrar la app se fuerza el envío con `keepalive`.

**Evidencia en el código.** `frontend/src/store/bookStore.ts` — `cloudCoalescers` (un `Map` a nivel de módulo), `CLOUD_COALESCE_MS = 3000`, `flushPendingCloudProgress`; y el rate limit dedicado de 600/15min para esa ruta (`src/config/rate-limit.ts`).

**Consecuencias.** Menos requests y menos riesgo de perder la última posición al cerrar. El `Map` crece sin límite si no se limpia, por eso existe `deleteCloudCoalescer`.

---

## D-09 — El progreso solo avanza

**Contexto.** Múltiples dispositivos envían su progreso en paralelo. Un requestDelayed desde el teléfono no debería borrar lo que el escritorio ya avanzó.

**Decisión.** `updateBookProgress` compara cada campo con el valor persistido y solo escribe los que representan avance. El scroll tiene una tolerancia de 50px para absorber el jitter de scroll. Si nada avanzó, devuelve el estado actual sin tocar la fila.

**Evidencia en el código.** `src/modules/books/application/books.service.ts` — las constantes `isNewerTime`, `isNewerScroll` (con `SCROLL_TOLERANCE_PX = 50`), `isNewerPage`, y el `logger.debug` del caso no-op.

**Consecuencias.** El progreso es monotónico. Editar el tiempo a la baja desde el perfil funciona porque usa `setReadingTime`, que es un valor absoluto y no pasa por esta comparación.

---

## D-10 — Concurrencia de la racha resuelta en la base de datos

**Contexto.** Pulsar "completar día" dos veces, o en dos dispositivos a la vez, no debe contar dos días.

**Decisión.** `updateStreakConditionally` usa `updateMany` con `lastActiveDate` como predicado. Si `count === 0`, otro request ganó y el service relee el estado ganador. Además, la creación de la fila captura la violación de `P2002` y relee.

**Evidencia en el código.** `src/modules/streak/infrastructure/streak.prisma.repository.ts` — `updateStreakConditionally`; los dos `catch` de `P2002` en `src/modules/streak/application/streak.service.ts`.

**Alternativas consideradas.** Un lock en memoria (no funciona con más de una instancia); confiar en el cliente.

**Consecuencias.** La racha nunca se cuenta dos. El service tiene tres caminos de retorno para el mismo "hoy ya está completo", lo que es más código del ideal.

---

## D-11 — La fecha del cliente decide el día de la racha

**Contexto.** "Hoy" cambia según la zona horaria. Si el servidor cuenta el día UTC, un usuario en UTC-5 puede ver su racha romperse o completarse en el momento equivocado.

**Decisión.** `POST /streak/complete` acepta `clientDate` en formato `YYYY-MM-DD`. Si viene, esa es la fecha que cuenta; si no, se usa la del servidor. Las comparaciones entre días usan UTC (`getUTCDateOnly`).

**Evidencia en el código.** `src/modules/streak/presentation/streak.dto.ts` — regex `YYYY_MM_DD`; `src/modules/streak/application/streak.service.ts` — `new Date(clientDate + "T12:00:00.000Z")` (mediodía UTC para evitar el borde de DST); `src/modules/streak/application/common/streak.utils.ts` — `toDateString` y `getUTCDateOnly`.

**Consecuencias.** El cliente puede manipular su propia racha; es aceptable porque la racha no tiene valor monetario. El noon-UTC evita que un cambio de horario de verano mueva el día.

---

## D-12 — Allowlist de CORS explícita, con escape para la LAN

**Contexto.** En desarrollo Tauri corre en `localhost:1420` y la WebView de Android en `tauri.localhost`, y en Docker la app entra por una IP variable de la red local. Mantener una lista estática obligaría a editar el `.env` en cada dispositivo.

**Decisión.** Lista explícita de origins, cargada desde `FRONTEND_URL`, más una lista de desarrollo hardcodeada. El carácter `*` está prohibido por código. Con `TRUST_BACKEND_ORIGINS=true` se acepta además cualquier origin cuyo host coincida con `X-Forwarded-Host`/`Host`.

**Evidencia en el código.** `src/config/origins.ts` — el `throw` si `FRONTEND_URL` contiene `*`, `DEV_EXTRA_ORIGINS`, `expectedOriginFromRequest`; `src/config/cors.ts` — `corsOriginGuard` rechaza con 403 antes de que el middleware de CORS responda.

**Consecuencias.** `TRUST_BACKEND_ORIGINS` solo es seguro detrás de un proxy de confianza: activo, cualquiera en la LAN puede llamar a la API. En `docker-compose.yml` viene en `true`.

---

## D-13 — Extraer el texto en el dispositivo

**Contexto.** Un PDF puede pesar 25MB. Mandarlo al backend aRenderizar en cada lectura sería caro; mandar el texto extraído en cada request también.

**Decisión.** El backend sirve el PDF crudo por streaming y el cliente lo procesa con pdf.js una sola vez. El texto resultante se cachea en IndexedDB con marcadores de página.

**Evidencia en el código.** `src/modules/books/application/books.service.ts` — `streamBookPdf` con `stream.pipeline`; `frontend/src/lib/pdfService.ts` — `processBookForReading` con salida temprana si el texto ya existe; `frontend/src/store/bookStore.ts` — overlay de "Preparando libro n%".

**Alternativas consideradas.** Extraer en el backend (sube el costo de infra y la latencia); renderizar el PDF con un visor embebido (pesa mucho más y no da texto seleccionable uniforme).

**Consecuencias.** El servidor solo hace de proxy de bytes. El cliente consume CPU y memoria para parsear, y el primer uso de cada libro es más lento. Los PDF escaneados sin capa de texto no producen nada legible: no hay OCR.

---

## D-14 — Bootstrapping de la URL de la API

**Contexto.** La app se distribuye como APK y binario. Hardcodear la URL de producción en el bundle obliga a republicar para cambiar de servidor.

**Decisión.** Al arrancar, `AppBootstrap` consulta un `config-api.json` remoto que expone `current_api_url`. El resultado se guarda en `localStorage` y se puede sobreescribir a mano. En desarrollo se saltea el bootstrap y se usa el backend local.

**Evidencia en el código.** `frontend/src/lib/api-config.ts` — `BOOTSTRAP_URL`, `BOOTSTRAP_FETCH_TIMEOUT_MS = 2500`, `isValidApiUrl`, `FALLBACK_PRODUCTION_URL`; `frontend/src/context/AppBootstrap.tsx` — máquina de estados `loading | ready | manual | retrieving` con formulario manual si falla; el `index.html` con el splash estático para que no haya pantalla en blanco.

**Consecuencias.** Se puede cambiar de servidor sin republicar. A cambio hay una dependencia de red en el arranque, mitigada con timeout, fallback y entrada manual.

---

## D-15 — Aislamiento por `user_book` en lugar de por `book`

**Contexto.** Un `book` puede estar en la biblioteca de varios usuarios. Autorizar por `book` solo dejaría que cualquiera que conozca un `bookId` lea el PDF de otro.

**Decisión.** Todas las operaciones pasan por buscar el `user_book` del usuario para ese libro. Si no existe, la respuesta es 403. Los marcadores cuelgan del `user_book`, no del libro.

**Evidencia en el código.** `findUserBook` (`src/modules/books/infrastructure/books.prisma.repository.ts`) y `findUserBookAccess` (`src/modules/bookmarks/infrastructure/bookmarks.prisma.repository.ts`); los `AppError("FORBIDDEN", 403, "No es tu libro")` en `book.service.ts`; `user_book` con `@@unique([userId, bookId])`.

**Consecuencias.** Cada acceso a un libro cuesta una query extra. A cambio, conocer un `bookId` ajeno no sirve de nada, y el borrado de un usuario no afecta al resto.
