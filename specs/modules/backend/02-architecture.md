# Backend Architecture

Arquitectura del backend Express del Bookteka — MVC con capa de servicios y repositorios.

---

## Principios

1. **Controller = HTTP**: extrae datos del request, verifica auth (`auth.api.getSession` o middleware `requireAuth`), llama al service, devuelve la response.
2. **Service = negocio**: orquesta repositorios + lógica (dedup, permisos, streak, URLs firmadas). No conoce Express.
3. **Repository = datos**: queries Prisma. Interfaz + implementación.
4. **Errores**: `AppError` en services; `errorHandler` central los convierte en HTTP.

---

## Estructura del proyecto

```
backend-express/
├── prisma/
│   ├── schema.prisma              # 9 modelos + enum ROLE
│   └── migrations/                # Migraciones versionadas
├── src/
│   ├── server.ts                  # Entry point: app.listen + graceful shutdown
│   ├── app.ts                     # Express app: helmet, cors, body-parser, registerRoutes
│   ├── http /routes.ts            # ⚠️ Carpeta con espacio literal ("http /") — registerRoutes
│   ├── routes/
│   │   ├── auth.routes.ts         # POST /register, /login, /refresh, /logout, GET /get-session, /verify-email, /resend-verification
│   │   ├── book.routes.ts         # upload, list, download, stream, progress, delete (requireAuth + multer)
│   │   ├── bookmark.routes.ts     # GET/POST /:bookId/bookmarks, DELETE /:bookmarkId
│   │   └── streak.routes.ts       # GET /, POST /complete, POST /initialize
│   ├── controllers/
│   │   ├── book.controller.ts
│   │   ├── bookmark.controller.ts
│   │   └── streak.controller.ts
│   ├── services/
│   │   ├── book.service.ts
│   │   ├── bookmark.service.ts
│   │   └── streak.service.ts
│   ├── repositories/
│   │   ├── book.repository.ts
│   │   ├── bookmark.repository.ts
│   │   └── streak.repository.ts
│   ├── schema/                    # auth.schema.ts, book.schema.ts, bookmark.schema.ts, streak.schema.ts
│   ├── dto/
│   │   ├── book/{params,request,response}.ts
│   │   └── bookmark/{params,request,response}.ts
│   ├── middleware/
│   │   ├── requireAuth.ts         # protege rutas (cookie / Bearer / x-session-token)
│   │   ├── validate.ts            # valida body/params/query con Zod
│   │   └── errorHandler.ts        # mapea Zod/AppError/Multer/Prisma → HTTP
│   ├── config/
│   │   ├── env.ts                 # variables validadas (JWT secrets ≥ 32 chars)
│   │   ├── prisma.ts              # singleton dbPrisma
│   │   ├── db.ts                  # pool pg (healthcheck)
│   │   ├── cors.ts                # corsOptions + corsOriginGuard
│   │   ├── rate-limit.ts          # 4 limiters + isProgressPath
│   │   ├── http-logger.ts         # pino-http
│   │   └── shutdown.ts            # graceful shutdown
│   ├── lib/
│   │   ├── auth.ts                # JWT/bcrypt/sesiones (auth.api, auth.cookies, auth.tokens)
│   │   ├── r2.ts                  # S3Client para Cloudflare R2
│   │   ├── email.ts               # Resend
│   │   ├── logger.ts              # pino
│   │   └── origins.ts             # allowlist de orígenes + TRUST_BACKEND_ORIGINS
│   ├── helper/
│   │   ├── errors.ts              # class AppError
│   │   ├── express.ts             # bodyOf/paramsOf/queryOf tipados
│   │   ├── format.ts              # normalizedFileName, generateFileHash
│   │   └── time.ts                # toDateString, getUTCDateOnly
│   └── __tests__/                 # Jest + Supertest
├── http/                          # REST Client (books.http, bookmarks.http, streaks.http)
├── doc/                           # Manual técnico (DOC.md, PRISMA.md)
├── jest.config.ts
└── package.json
```

> ⚠️ **Quirk**: la carpeta `src/http /routes.ts` tiene un espacio en el nombre (`"http /"`). Funciona, pero es candidata a renombrarse a `routes/index.ts` o similar en una limpieza futura.

---

## Capas en detalle

### `routes/`

- Routers Express por feature.
- Auth pública en `auth.routes.ts` (register/login/refresh/logout/get-session/verify-email/resend).
- `book.routes.ts`, `bookmark.routes.ts`, `streak.routes.ts` usan `requireAuth` a nivel de router.
- Multer (25MB) se configura en `book.routes.ts` con campos `file` y `pdf` (compatibilidad).

### `controllers/`

- Funciones async exportadas que reciben `(req, res)`.
- Usan `auth.api.getSession({ headers: req.headers })` para resolver el usuario, o confían en `req.userId` seteado por `requireAuth`.
- Devuelven `res.json(...)` o lanzan errores que captura `errorHandler`.

### `services/`

- **Clases con métodos de instancia e inyección por constructor**, NO métodos estáticos. Cada service recibe su repositorio por defecto en el constructor y se exporta como singleton.
  ```ts
  // services/book.service.ts
  const bookRepository = new BookRepository();
  export class BookService {
    constructor(private readonly repo: BookRepository = bookRepository) {}
    async getUserBooks(userId: string) { ... }   // método de instancia
  }
  export const bookService = new BookService();  // singleton que usan los controllers
  ```
  Los controllers llaman **`bookService.getUserBooks(userId)`**, nunca `BookService.getUserBooks(...)`. El default del constructor existe para que los tests puedan inyectar un repo fake: `new BookService(fakeRepo)`.
- Lanzan `AppError(code, status, message)`.
- `BookService.uploadBook`: hash SHA-256 → buscar por hash → si no existe, subir a R2 + crear book → upsert user_book.
- `BookService.deleteBook`: verificar ownership → contar otros usuarios → borrar de R2 solo si es el único → auditoría → borrar user_book (y book si quedó solo).
- `BookService.updateBookProgress`: solo persiste los campos que representan avance real (tolerancia de 50px en `scrollPosition`); si nada avanzó devuelve el estado persistido sin tocar la fila.
- `StreakService.completeDay`: lógica de días consecutivos con `clientDate` opcional.

### `repositories/`

- Interfaz + clase con queries Prisma.
- `BookRepository`: getUserBooks, findByHash, createBook, upsertUserBook, findUserBook, countOtherUsers, deleteUserBook, deleteBook, createAuditLog, updateUserBook.
- `BookmarkRepository`: findUserBookAccess, getBookmarksByUserBookId, createBookmark, findBookmark, deleteBookmark.
- `StreakRepository`: findByUserId, createStreak, updateStreak, **updateStreakConditionally** (`updateMany` con `lastActiveDate` como predicado de concurrencia; devuelve `null` si otro request ganó la carrera), upsertStreak.

### `lib/auth.ts` (corazón del auth)

- `signAccessToken({ userId, email, role })` — JWT 15 min.
- `signRefreshToken(userId)` — JWT 7 días con `jti` (uuid).
- `issueTokens(user, headers?, client?)` — access + refresh + INSERT session.
- `getSession({ headers })` — acepta `Authorization: Bearer`, `x-session-token`, o cookie `accessToken`.
- `refresh(refreshToken)` — verifica, **compare-and-delete** la sesión (rotación single-use), emite tokens nuevos en transacción.
- `login` / `register` — bcrypt compare/hash; register crea user + account en transacción.
- Cookies: `accessToken`/`refreshToken`, `httpOnly`, `secure` en prod, `sameSite: none` (prod) / `lax` (dev).

---

## Dependency flow

```
Routes → Controllers → Services → Repositories → Prisma (dbPrisma)
                 ↑                        ↓
              lib/auth.ts            helper/errors.ts (AppError)
```

Inversión parcial: los services dependen de la interfaz del repositorio; la implementación concreta se instancia dentro del service.

---

## AppError (errores)

```ts
export class AppError extends Error {
  constructor(public code: string, public statusCode: number, message: string) {
    super(message);
  }
}
```

### `errorHandler` (middleware/errorHandler.ts)

| Error | HTTP | Shape |
|---|---|---|
| `ZodError` | 400 | `{ error: "Validation failed", details: [{ path, message }] }` |
| `AppError` | `err.statusCode` | `{ error: err.message, code: err.code }` |
| `multer.MulterError` LIMIT_FILE_SIZE | 413 | `{ error: "El archivo excede el tamaño máximo permitido (20MB)", code }` |
| `multer.MulterError` (otro) | 400 | `{ error, code }` |
| Prisma P2002 | 409 | `{ error: "Registro duplicado", code }` |
| Prisma P2025 | 404 | `{ error: "Recurso no encontrado", code }` |
| Prisma P2003 | 400 | `{ error: "Violación de clave foránea", code }` |
| Genérico | 500 | `{ error: "Internal Server Error", requestId }` |

---

## Rate limiting (config/rate-limit.ts)

| Limiter | Ventana | Límite | Aplica a |
|---|---|---|---|
| `sessionLimiter` | 15 min | 200 | `/api/v1/auth/get-session` |
| `authLimiter` | 15 min | 10 | `/api/v1/auth/*` (salvo get-session) |
| `progressLimiter` | 15 min | 600 | `PATCH /books/:id/progress` |
| `globalLimiter` | 15 min | 100 | `/api/v1/*` (salvo health, auth, progress) |

`isProgressPath` detecta `PATCH /books/:id/progress` con regex para aplicar el limiter específico.

---

## CORS (config/cors.ts + lib/origins.ts)

- `origin: true` (refleja el origin) + `credentials: true`.
- `allowedHeaders`: `Content-Type`, `Authorization`, `x-session-token`, `x-refresh-token`.
- `corsOriginGuard`: rechaza (403) origins que no estén en la allowlist.
- Allowlist: `FRONTEND_URL` (env, separado por comas) + extras de dev (`localhost:3000/5173/8081/1420`, `tauri.localhost`, etc.).
- `TRUST_BACKEND_ORIGINS=true` permite confiar en origins cuyo host coincida con `X-Forwarded-Host`/`Host` (usado detrás de nginx en Docker).

---

## Logging

- `pino` + `pino-http` (`config/http-logger.ts`).
- Cada request queda logueado con `req.id`, method, url, statusCode, responseTime.
- El `errorHandler` logea los 500 explícitamente (pino-http no captura errores async).

---

## Montaje de rutas (src/http /routes.ts)

```
GET    /api/v1/health                    (healthHandler: DB + R2)
POST   /api/v1/auth/*                    (authLimiter)
GET    /api/v1/auth/get-session          (sessionLimiter)
PATCH  /api/v1/books/:id/progress        (progressLimiter)
GET/POST/PATCH/DELETE /api/v1/books/*    (globalLimiter)
GET/POST/DELETE /api/v1/books/:bookId/bookmarks/*
GET/POST /api/v1/streak/*
404 → { error: "Ruta no encontrada" }
errorHandler
```

---

## Convenciones de naming

| Concepto | Convención |
|---|---|
| Archivo de ruta | `snake_case.routes.ts` |
| Archivo de controller | `snake_case.controller.ts` |
| Archivo de service | `snake_case.service.ts` (clase `PascalCaseService`) |
| Archivo de repository | `snake_case.repository.ts` (interfaz `I*Repository` + clase `*Repository`) |
| Schemas Zod | `PascalCaseSchema` (`LoginSchema`, `BookIdParamSchema`) |
| DTO | `PascalCase` + sufijo `DTO`/`Response`/`Params` |
| Errores | `AppError("CODE", status, "mensaje")` con codes en UPPER_SNAKE |
