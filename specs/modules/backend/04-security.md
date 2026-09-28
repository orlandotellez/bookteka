# Backend Security

Mecanismos de autenticación, autorización, validación y manejo de secretos del backend Express.

---

## Autenticación

JWT propio implementado en `src/lib/auth.ts` (373 líneas). No hay librería de auth: firma, verificación, cookies y sesiones están a mano.

### Tokens

| Token | Vida | Contenido | Persistido |
|---|---|---|---|
| Access | **15 min** (`ACCESS_TOKEN_SECONDS`) | `{ userId, email, role, exp }` | No. Se verifica firmando. |
| Refresh | **7 días** (`REFRESH_TOKEN_SECONDS`) | `{ userId, jti (uuid), exp }` | Sí, en la tabla `session`. |

### Transportes (los cuatro tienen que funcionar)

`tokenFromHeaders` acepta, en este orden de prioridad para el access token:

1. `Authorization: Bearer <jwt>`
2. `x-session-token: <jwt>`
3. cookie `accessToken`

Para el refresh: `x-refresh-token` o cookie `refreshToken`. `POST /auth/refresh` además acepta el refresh token en el body (`refreshTokenFromRequest`), que es lo que hace el cliente web.

**Por qué el transporte dual**: la WebView de Android llama a la API por IP de la red local, o sea cross-site, y una cookie `SameSite=Lax` no viaja. Los headers lo resuelven sin relajar la seguridad del navegador. `frontend/vite.config.ts` documenta el problema en un comentario largo, y el proxy `/api` de Vite existe por eso.

### Cookies

| Cookie | `httpOnly` | `secure` | `sameSite` | `path` | `maxAge` |
|---|---|---|---|---|---|
| `accessToken` | sí | en producción | `none` (prod) / `lax` (dev) | `/` | 15 min |
| `refreshToken` | sí | en producción | `none` (prod) / `lax` (dev) | `/` | 7 días |

`clearAuthCookies` las borra con `Max-Age=0` en el logout.

### Contraseñas

`bcrypt` con costo **10** (`bcrypt.hash(data.password, 10)`). El hash vive en `account.password` con `provider_id = "credentials"`. No hay columna de password en `user`.

### Sesiones

Una fila por refresh token en la tabla `session`, con `ip_address` (del header `x-forwarded-for`) y `user_agent`. La rotación es **single-use**: `refresh()` hace `deleteMany({ where: { id, token } })` dentro de una transacción y si `count !== 1` responde 401. Dos requests concurrentes con el mismo token: uno gana, el otro falla.

### Verificación de correo

`createVerification` genera un código de 6 caracteres del alfabeto `A-Z0-9` con 15 minutos de validez y lo guarda en `verification`. `verifyEmail` valida, marca `email_verified = true` y borra el registro.

> **El código no se envía por email.** Se imprime con `console.info` en `lib/auth.ts`. `src/lib/email.ts` implementa `sendEmail()` con Resend y **ningún archivo lo importa**. Ver `specs/tasks/backend/02-email-verificacion.md`.

---

## Autorización

### Modelo

Dos roles en el enum `ROLE`: `user` (default del registro) y `admin`.

> **`admin` no se usa.** El rol viaja en el JWT y en las respuestas, pero no hay ninguna ruta, guard ni pantalla que lo compruebe. `prisma/migrations/20260802040000_remove_cajero_role` ya eliminó un tercer rol que estaba sin uso.

### Aislamiento por recurso

No hay control de acceso por rol. El aislamiento es **por propiedad del recurso**, y se implementa en la capa de service:

| Operación | Verificación | Si falla |
|---|---|---|
| Listar libros | `getUserBooks(userId)` filtra por `userId` de la sesión | Lista vacía |
| Descargar / ver PDF | `findUserBook(userId, bookId)` | `403 FORBIDDEN` "No es tu libro" |
| Actualizar progreso | `findUserBook(userId, bookId)` | `404 NOT_FOUND` "Libro no encontrado para este usuario" |
| Borrar libro | `findUserBook(userId, bookId)` | `404 NOT_FOUND` |
| Marcadores (listar, crear, borrar) | `findUserBookAccess(userId, bookId)` | `403 FORBIDDEN` "No autorizado o libro no encontrado" |

El `userId` sale **siempre** de `req.userId`, que `requireAuth` setea desde la sesión verificada. Nunca del body ni de los params. `requireAuth` corre a nivel de router en `book.routes.ts`, `bookmark.routes.ts` y `streak.routes.ts`.

### Nota sobre el status inconsistente

`deleteBook` y `updateBookProgress` responden **404** cuando el libro no es del usuario, mientras que `downloadBookWithUrl` y `streamBookPdf` responden **403** con el mismo caso. No es una fuga de información (los dos ocultan la existencia del recurso), pero es inconsistente y hace más difícil escribir tests de contrato.

---

## Validación de entrada

### Middleware `validate`

`src/middleware/validate.ts` es un HOF genérico: `validate({ body?, params?, query? })` con Zod.

- `body` se parsea y se **reasigna** a `req.body`.
- `query` se reasigna a `req.query`.
- `params` se reasigna campo por campo para conservar el shape `Record<string, string>` que espera Express.
- El parámetro de tipo `S` es *phantom*: existe solo para que el controller obtenga `bodyOf<typeof S["body"]>(req)` con el tipo correcto y sin costo en runtime.

Un `ZodError` se propaga por `next(err)` y el `errorHandler` lo mapea a `400` con `{ error: "Validation failed", details: [{ path, message }] }`.

### Rutas con validación

| Ruta | Valida |
|---|---|
| `POST /auth/register` | `RegisterSchema` (body) |
| `POST /auth/login` | `LoginSchema` (body) |
| `POST /auth/verify-email` | `VerifyEmailSchema` (body) |
| `POST /auth/resend-verification` | `ResendVerificationSchema` (body) |
| `GET /books/:id/download` | `BookIdParamSchema` (params) |
| `GET /books/:id/stream` | `BookIdParamSchema` (params) |
| `PATCH /books/:id/progress` | `BookIdParamSchema` + `UpdateBookProgressBodySchema` |
| `DELETE /books/:id` | `BookIdParamSchema` (params) |
| `GET /books/:bookId/bookmarks` | `BookIdParamSchema` (params) |
| `POST /books/:bookId/bookmarks` | `BookIdParamSchema` + `CreateBookmarkBodySchema` |
| `DELETE /books/:bookId/bookmarks/:bookmarkId` | `BookmarkIdParamSchema` (params) |
| `POST /streak/complete` | `CompleteDayBodySchema` (body) |
| `POST /streak/initialize` | `InitializeStreakBodySchema` (body) |

**Sin validar**: `POST /books/upload` (el body viene de `multer` y lo tipa `UploadBookRequestDTO`; el archivo tiene su propio límite de tamaño), `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/get-session`, `GET /streak`.

### Detalles que importan

- **Los ids no se validan como UUID.** `BookIdParamSchema` usa `z.string().min(1, "id requerido")`. Los ids son `TEXT` en la base, no tipado por la validación.
- **No hay `.strict()`.** Los schemas de body usan el comportamiento por defecto de Zod (`.strip()`): las claves desconocidas se descartan en silencio. Está documentado en `src/schema/book.schema.ts` como decisión deliberada para no romper clientes legacy.
- **`lastReadAt` y `clientTimestamp` usan `preprocess`** para aceptar string ISO-8601 o epoch ms, más un `.refine(!isNaN)` que rechaza el `Invalid Date` que antes se persistía como `null`.
- **`scrollPosition` se redondea**: `.nonnegative().finite().transform(v => Math.round(v))`, porque el cliente manda floats.

### Uploads

`multer` con `memoryStorage()` y `limits: { fileSize: 25 * 1024 * 1024 }`. Acepta dos nombres de campo para el archivo: `file` y `pdf` (alias, por compatibilidad). El controller toma `files["file"]?.[0] ?? files["pdf"]?.[0]` y si no hay ninguno lanza `AppError("BAD_REQUEST", 400, "File not found")`.

> El mensaje del 413 en `errorHandler.ts` dice "20MB" cuando el límite real es 25MB. Ver `specs/tasks/backend/05-ci-y-calidad.md`.

---

## Secretos

### Variables obligatorias

`src/config/env.ts` lanza `Missing environment variable: <key>` al arrancar si falta cualquiera. Además `JWT_SECRET` y `JWT_REFRESH_SECRET` deben tener **32 caracteres o más**.

| Clave en `env.ts` | Variable de entorno | Para qué |
|---|---|---|
| `PORT` | `PORT` (default 3000) | Puerto del servidor. |
| `DATABASE_URL` | `DATABASE_URL` | Conexión a PostgreSQL. |
| `FRONTEND_URL` | `FRONTEND_URL` | Allowlist de CORS, separada por comas. |
| `JWT_SECRET` | `JWT_SECRET` | Firma del access token. |
| `JWT_REFRESH_SECRET` | `JWT_REFRESH_SECRET` | Firma del refresh token. |
| `R2_ACCESS_KEY` | `R2_ACCESS_KEY_ID` | Credencial de Cloudflare R2. |
| `R2_SECRET_KEY` | `R2_SECRET_ACCESS_KEY` | Credencial de R2. |
| `R2_S3_API` | `R2_ENDPOINT` | Endpoint S3 de R2. |
| `R2_BUCKET` | `R2_BUCKET` | Bucket donde viven los PDFs. |
| `R2_PUBLIC_DOMAIN` | `R2_PUBLIC_DOMAIN` | Dominio público para armar `fileUrl`. |
| `RESEND_API_KEY` | `RESEND_API_KEY` | API key de Resend (**hoy no se usa**, ver arriba). |
| `RESEND_FROM_EMAIL` | `RESEND_FROM_EMAIL` | Remitente (**hoy no se usa**). |

> El mapeo interno no coincide con el nombre de la variable. Está documentado en `specs/tasks/backend/03-configuracion.md`.

### Escape en entorno de test

`getJwtSecret` devuelve un secreto conocido si `NODE_ENV === "test"`:
```ts
if (!value && process.env.NODE_ENV === "test") {
  return `${key.toLowerCase()}-test-secret-with-at-least-32-characters`;
}
```
Es intencional para los tests, pero es una puerta: si `NODE_ENV=test` llega a un entorno desplegado, el backend arranca con un secreto público. Ver `specs/tasks/backend/03-configuracion.md` tarea 3.

### Redacción en logs

`src/lib/logger.ts` configuja `pino` con `redact` sobre: `req.headers.authorization`, `req.headers.cookie`, `*.password`, `*.secret`, `*.token`, con censor `[REDACTED]`.

### Git

`.gitignore` de la raíz contiene `.env`. Los tres `.env.example` están commiteados (no tienen secretos). La keystore de Tauri y los APKs están ignorados en `frontend/.gitignore` y no están trackeados. Verificado.

---

## Rate limiting

`src/config/rate-limit.ts`, cuatro limiters de `express-rate-limit` con `standardHeaders: true` y `legacyHeaders: false`.

| Limiter | Ventana | Límite | Se aplica a | `skip` |
|---|---|---|---|---|
| `sessionLimiter` | 15 min | **200** | `/api/v1/auth/get-session` | — |
| `authLimiter` | 15 min | **10** | `/api/v1/auth/*` | `req.path.endsWith("/get-session")` |
| `progressLimiter` | 15 min | **600** | `PATCH /books/:id/progress` | — |
| `globalLimiter` | 15 min | **100** | resto de `/api/v1/*` | `/health*`, `/auth*`, rutas de progress |

`isProgressPath` detecta las rutas de progreso con `^\/books\/[^/]+\/progress\/?$`. El orden de montaje en `src/http /routes.ts` importa: el limiter específico va antes del global.

El límite alto de `get-session` es deliberado: el frontend consulta la sesión al montar cada ruta, con un TTL de 5 minutos en `sessionCache.ts`.

> `express-rate-limit` mantiene su estado en memoria. Con más de una instancia del backend, cada una tendría su propio contador y el límite real sería el límite × instancias. Relevante solo si se escala horizontalmente; ver `specs/docs/05-requisitos-no-funcionales.md`.

---

## CORS

`src/config/cors.ts` + `src/lib/origins.ts`.

```ts
export const corsOptions: cors.CorsOptions = {
  origin: true,          // refleja el Origin
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-session-token", "x-refresh-token"],
};
```

`corsOriginGuard` corre **antes** del middleware de CORS y rechaza con `403 FORBIDDEN` cualquier origin que no esté permitido, en vez de dejar que CORS responda con el header correcto y el navegador bloquee.

### Allowlist

- `FRONTEND_URL` del entorno, parseada por comas.
- `*` está **prohibido por código**: `lib/origins.ts` lanza al arrancar si lo encuentra, porque es incompatible con `credentials: true`.
- En desarrollo se suma `DEV_EXTRA_ORIGINS`: `localhost:3000`, `localhost:5173`, `localhost:8081`, `localhost:1420`, `127.0.0.1:3000`, `127.0.0.1:5173`, `tauri.localhost`.
- En producción (`NODE_ENV === "production"`) la lista es **solo** `FRONTEND_URL`: los extras son únicamente de desarrollo.

### `TRUST_BACKEND_ORIGINS`

Con el flag en `true`, se acepta cualquier origin cuyo host coincida con `X-Forwarded-Host` (o, en su defecto, `Host`) y cuyo protocolo coincida con `X-Forwarded-Proto`. Sirve para que la app entre por una IP variable de la LAN sin editar `FRONTEND_URL`.

`docker-compose.yml` lo activa. **Solo es seguro detrás de un proxy de confianza**: con el flag activo, cualquiera que llegue al backend desde la LAN puede llamar a la API.

---

## Headers de seguridad

`helmet` en `src/app.ts`, con dos ajustes:

```ts
helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },  // necesario para el stream de PDF
  crossOriginEmbedderPolicy: false,                        // incompatible con el anterior
})
```

El resto de los defaults de helmet se aplican: `X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Referrer-Policy`, etc.

`app.set("trust proxy", 1)`: el backend confía en un salto de proxy, que es lo que hay detrás de nginx en Docker y de Railway.

> **No hay CSP en Tauri.** `frontend/src-tauri/tauri.conf.json` tiene `"security": { "csp": null }`.

---

## Resumen de gaps de seguridad

| Gap | Archivo | Impacto |
|---|---|---|
| El código de verificación no se envía | `src/lib/auth.ts` | La verificación de email no es completable por el usuario. |
| `role: admin` sin ninguna comprobación | enum `ROLE` | Si se agrega una ruta sin guard, queda abierta. |
| El access token no se revoca al hacer logout | `src/lib/auth.ts` | Ventana de hasta 15 min. Decisión consciente (D-05). |
| Status inconsistente 403 vs 404 | `book.service.ts` | Dificulta tests de contrato; no filtra información. |
| Sin CSP en el shell nativo | `tauri.conf.json` | Menos aislamiento en desktop y Android. |
| Sin tests de seguridad | `src/__tests__/` | Cero cobertura de CORS, rate limit, CSRF y escalada de privilegios. |
| Escape de secreto JWT con `NODE_ENV=test` | `config/env.ts` | Puerta trasera de secreto conocido. |
| Rate limit en memoria | `config/rate-limit.ts` | El límite real escala con el número de instancias. |
