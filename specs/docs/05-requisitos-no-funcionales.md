# 05 — Requisitos no funcionales

Estos son los límites que el código **ya impone**. Cuando el proyecto no define un número, se dice explícitamente en lugar de inventarlo. Los objetivos pendientes están marcados como tales.

---

## Rendimiento

### Lo que el código garantiza

| Medida | Valor | Dónde |
|---|---|---|
| Tamaño máximo de PDF | **25 MB** | `src/routes/book.routes.ts` — `multer.memoryStorage` con `limits.fileSize`. |
| Timeout del health check | **2 s** por dependencia | `src/http /health.ts` — `HEALTHCHECK_TIMEOUT_MS`. |
| Timeout de cierre ordenado | **10 s** antes del `exit(1)` forzado | `src/config/shutdown.ts` — `FORCED_SHUTDOWN_TIMEOUT_MS`. |
| Vida del access token | **15 min** | `src/lib/auth.ts` — `ACCESS_TOKEN_SECONDS`. |
| Vida del refresh token | **7 días** | `src/lib/auth.ts` — `REFRESH_TOKEN_SECONDS`. |
| Vida del código de verificación | **15 min** | `src/lib/auth.ts` — `VERIFICATION_SECONDS`. |
| Validez de la URL firmada de descarga | **15 min** | `src/services/book.service.ts` — `expiresIn: 60 * 15`. |
| Coalescer de `PATCH /progress` | **3 s** por libro | `frontend/src/store/bookStore.ts` — `CLOUD_COALESCE_MS`. |
| Timeout del bootstrap remoto de la API | **2,5 s** | `frontend/src/lib/api-config.ts` — `BOOTSTRAP_FETCH_TIMEOUT_MS`. |
| TTL de la caché de sesión | **5 min** en memoria | `frontend/src/lib/sessionCache.ts` — `CACHE_TTL_MS`. |
| Reintento mínimo tras fallo de sesión | **30 s** | `frontend/src/lib/sessionCache.ts` — `MIN_RETRY_MS`. |
| Paginación de la biblioteca | **6 libros** por página (grid/lista) | `frontend/src/pages/Index.tsx` — `ITEMS_PER_PAGE`. |
| Límite de body JSON | **25 MB** | `src/app.ts` — `express.json({ limit: "25mb" })`. |

### Decisiones de diseño que afectan rendimiento

- **El PDF no pasa por la base de datos.** Solo se guardan `fileKey` y `fileUrl`. Los bytes viven en R2.
- **El texto extraído se cachea en el dispositivo.** `processBookForReading` es un no-op si `book.text.length > 10`, así que un libro ya leído no vuelve a descargarse ni a parsearse.
- **El worker de PDF va aparte del bundle** (`pdf.worker.min.mjs` importado como URL por Vite).
- **Los PATCH de progreso se agrupan.** Sin el coalescer, hacer scroll generaría decenas de requests por minuto.
- **`updateBookProgress` ignora valores sin avance**, con tolerancia de 50px en scroll. Evita escrituras inútiles a PostgreSQL.
- **El listado de libros ordena por `lastReadAt` en la query** (`orderBy` en `BookRepository.getUserBooks`), no en memoria.

### Objetivos pendientes

No hay métricas de bundle ni de tiempo de respuesta commiteadas en el repo. Si el proyecto necesita un objetivo concreto (por ejemplo "la biblioteca carga en menos de 1 s con 200 libros"), hay que medirlo primero y recién después escribirlo acá. Ver `specs/tasks/frontend/04-observabilidad.md`.

---

## Seguridad

### Lo que ya está implementado

| Control | Implementación | Dónde |
|---|---|---|
| Hash de contraseñas | bcrypt, costo **10** | `src/lib/auth.ts` — `bcrypt.hash(data.password, 10)`. |
| Firmas de token | Secrets distintos para access y refresh, mínimo **32 caracteres**, validados al arrancar | `src/config/env.ts` — `getJwtSecret`. |
| Rotación de refresh token | **Single-use**: `deleteMany` por id + token dentro de una transacción. Dos requests concurrentes con el mismo token: solo uno gana. | `src/lib/auth.ts` — `refresh()`. |
| Aislamiento de sesiones | Cada sesión registra `ip_address` y `user_agent`. | `src/lib/auth.ts` — `createSession`. |
| Cookies de sesión | `httpOnly: true`; `secure` y `sameSite: none` en producción; `lax` en desarrollo. | `src/lib/auth.ts` — `cookieOptions`. |
| Protección contra CSRF | El access token se acepta por header (`Authorization`/`x-session-token`), no solo por cookie. | `src/lib/auth.ts` — `tokenFromHeaders`. |
| Autorización por recurso | Toda operación sobre un libro pasa por `user_book` del usuario. Un `bookId` ajeno da 403, no datos. | `findUserBook` / `findUserBookAccess`. |
| Aislamiento en la base de datos | Queries filtran siempre por `userId` derivado de la sesión, nunca del body. | Todos los services. |
| Bypass de soft-delete | `login` y `getSession` filtran `deleted_at: null`. | `src/lib/auth.ts`. |
| Headers de seguridad | `helmet` con `crossOriginResourcePolicy: cross-origin` (necesario para el stream de PDF) y `crossOriginEmbedderPolicy: false`. | `src/app.ts`. |
| Allowlist de CORS | Lista explícita; `*` está **prohibido** por código porque rompe `credentials: true`. | `src/lib/origins.ts`. |
| Rate limiting | 4 tiers (ver abajo). | `src/config/rate-limit.ts`. |
| Validación de entrada | Zod en `body`, `params` y `query` de todas las rutas con input. | `src/middleware/validate.ts`. |
| Límite de upload | 25MB por Multer. | `src/routes/book.routes.ts`. |
| Redacción de secretos en logs | `authorization`, `cookie`, `password`, `secret`, `token` → `[REDACTED]`. | `src/lib/logger.ts`. |
| Detección de errores de Prisma | P2002→409, P2025→404, P2003→400. Sin stack al cliente. | `src/middleware/errorHandler.ts`. |

### Rate limits

| Alcance | Ventana | Límite |
|---|---|---|
| `/api/v1/auth/*` (salvo `get-session`) | 15 min | **10** |
| `/api/v1/auth/get-session` | 15 min | **200** |
| `PATCH /api/v1/books/:id/progress` | 15 min | **600** |
| Resto de `/api/v1/*` | 15 min | **100** |

El límite de `get-session` es alto a propósito: el frontend lo consulta en cada arranque de ruta y con un TTL de 5 minutos.

### Pendientes de seguridad

| Gap | Impacto | Dónde |
|---|---|---|
| **El código de verificación se imprime por consola** | Sin email, el flujo de verificación es completable solo por quien tenga acceso a los logs. | `src/lib/auth.ts` — `createVerification`. `src/lib/email.ts` existe sin usarse. |
| **Mensaje de error desactualizado** | El 413 dice "20MB" cuando el límite es 25MB. Cosmético, pero confunde al usuario. | `src/middleware/errorHandler.ts`. |
| **`role: admin` sin usar** | El rol viaja en el JWT y en las respuestas, pero ninguna ruta lo chequea. Si mañana se agrega una ruta sin guard, queda abierta. | Enum `ROLE` en `prisma/schema.prisma`. |
| **Sin CSP en Tauri** | `tauri.conf.json` tiene `"csp": null`. | `frontend/src-tauri/tauri.conf.json`. |
| **Sin revocación de access token** | El access token es stateless: un logout no lo invalida hasta que expira (15 min). | `src/lib/auth.ts`. |
| **Sin tests de seguridad** | No hay casos de prueba para CSRF, CORS ni escalada de privilegios. | `src/__tests__/`. |

---

## Escalabilidad

### Lo que el diseño ya aguanta

- **La deduplicación de PDFs** (`book.fileHash @unique`) evita almacenar N copias del mismo archivo. Un PDF subido por 100 usuarios ocupa un objeto en R2.
- **El borrado es cooperativo**: el objeto de R2 solo se elimina cuando `countOtherUsers(bookId) === 0`. Un libro compartido no se rompe al borrarlo un usuario.
- **La conexión a la base de datos es un singleton** (`dbPrisma`), no un pool por request. En `pnpm dev` se cachea en `globalThis` para no recrear el cliente con el hot reload.
- **El pool de `pg` existe pero no se usa** en el camino caliente: `src/config/db.ts` lo expone y nada lo consume (`src/http /health.ts` usa Prisma, no `pg`).
- **La lectura de PDF es streaming** (`stream.pipeline` de `node:stream`), no un buffer completo en memoria del servidor.
- **El merge de sincronización es O(n) sobre los libros del usuario**, no sobre los libros de todos.

### Límites conocidos

| Límite | Consecuencia |
|---|---|
| El listado de libros no pagina | `GET /books` devuelve todos los libros del usuario. Con cientos de libros la respuesta crece sin cota. |
| No hay índices compuestos en `user_book` | Los índices son `userId`, `bookId` y el único `(userId, bookId)`. Un query que filtre por ambos más orden no tiene índice dedicado. |
| `session` no tiene política de purga | Las sesiones vencidas se borran solo cuando alguien intenta usarlas (`getRefreshTokenUser`). No hay job de limpieza. |
| `verification` no tiene purga | Los códigos expirados se borran al intentar verificarlos, no por tiempo. |
| La instancia es única | `app.set("trust proxy", 1)` y un solo `app.listen`. No hay cluster ni réplicas; escalar es vertical. |

---

## Disponibilidad

| Aspecto | Estado |
|---|---|
| Health check | `GET /api/v1/health` — verifica **DB y R2**, cada uno con timeout de 2s. Devuelve 200 solo si ambos responden; 503 si alguno falla. |
| Logging | `pino-http` con `req.id`, nivel automático (5xx→error, 4xx→warn, resto→info) y exclusión del health check. |
| Cierre ordenado | `SIGTERM` y `SIGINT` cierran el server y desconectan Prisma. Timeout forzado a los 10s. |
| Rechazos no manejados | `unhandledRejection` se loguea; `uncaughtException` loguea, hace flush y sale con código 1. |
| Idempotencia de la racha | `updateStreakConditionally` usa `updateMany` con `lastActiveDate` como predicado. Si dos requests compiten, uno gana y el otro relee el estado ganador. El usuario nunca ve la racha incrementada dos veces. |
| Streaming con fallback | Si R2 falla al leer un PDF, `streamBookPdf` responde 500 y el frontend conserva el texto ya extraído localmente. |
| Borrado de R2 tolerante | `deleteR2Quietly` (`src/helper/r2.ts`) loguea el error y **no interrumpe el borrado en la base de datos**. Un archivo huérfano es preferible a una fila colgada. |
| Despliegue | Railway con `RAILPACK` (`backend-express/railway.toml`). `docker-entrypoint.sh` espera a PostgreSQL y aplica migraciones antes de arrancar. |
| Docker Compose | Healthcheck de PostgreSQL con `pg_isready`; el backend depende de `service_healthy`. |

### Sin definir

- No hay SLA ni objetivo de disponibilidad documentado.
- No hay monitoreo ni alertas configuradas.
- No hay circuit breaker ni reintentos ante caída de R2: cada request que necesita el archivo falla individualmente.
- No hay réplicas ni balanceo. La disponibilidad depende de que la única instancia esté viva.

---

## Mantenibilidad

| Aspecto | Estado |
|---|---|
| Tipado | `strict: true` en backend y frontend. |
| Capas | `routes → controllers → services → repositories` sin excepciones en el backend. |
| Inyección de dependencias | Los services reciben el repositorio por constructor con default, lo que permite tests sin mocks de módulo. |
| Configuración validada | `src/config/env.ts` falla al arrancar si falta una variable, en vez de romper en runtime. |
| Alias consistente | `@/*` funciona igual en TS, en el build y en Jest. |
| Tests | 2.897 líneas de test en el backend (7 suites) y 59 tests en el frontend (8 archivos). |
| Documentación | Este árbol de specs, más `backend-express/doc/DOC.md` (65 KB) y `backend-express/doc/PRISMA.md`. |
| Deuda registrada | `specs/tasks/`, con el archivo de origen en cada tarea. |

### Deuda estructural

| Deuda | Consecuencia |
|---|---|
| `src/http /routes.ts` — carpeta con espacio literal en el nombre | Frágil ante renombres y shell scripts. Funciona, pero conviene corregirlo. |
| `src/lib/email.ts` sin importar | Código muerto que sugiere una capacidad que no existe. |
| `frontend/src/hooks/useBooks.tsx` sin importar | Segunda implementación del estado de libros que va a divergir. |
| `frontend/src/config/db.ts` (pool `pg`) sin uso en el backend | Un segundo pathway de conexión a la base de datos, sin consumidor. |
| `dto/bookmark/response.ts` vacío | Contrato de respuesta sin definir; el service devuelve el modelo crudo de Prisma. |
| `RefreshSchema` y `SessionIdSchema` (`src/schema/auth.schema.ts`) sin uso | Schemas muertos. |
| Sin CI | Nada obliga a que `pnpm test` y `pnpm build` pasen. |
| ESLint instalado sin archivo de configuración | `pnpm exec eslint` no funciona: no hay `eslint.config.js`. |
