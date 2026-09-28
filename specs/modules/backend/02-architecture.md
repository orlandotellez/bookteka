# Backend Architecture

Arquitectura del backend Express del Bookteka — **módulos verticales** con capas internas (`presentation → application → domain → infrastructure`).

---

## Principios

1. **Un módulo por feature.** `auth`, `books`, `bookmarks` y `streak` son módulos autocontenidos. Todo lo que una feature necesita vive en su carpeta: rutas, controller, service, repositorio, dominio y tests.
2. **Capas internas con dirección única.** Dentro de cada módulo, la dependencia fluye de la frontera hacia adentro: `presentation → application → domain`. `infrastructure` implementa los contratos que `application` declara en `domain`.
3. **Los services dependen de interfaces de repositorio, nunca de Prisma.** `domain/<feature>.interface.ts` declara el contrato; `infrastructure/<feature>.prisma.repository.ts` lo implementa; los tests inyectan un fake de `src/tests/fakes.ts`.
4. **El controller es la única capa que conoce Express.** `route → controller → service`.
5. **Errores**: `AppError` en `core/errors/AppError.ts` y un solo `errorHandler` en `config/error-handler.ts`.

---

## Estructura del proyecto

```
backend-express/
├── prisma/
│   ├── schema.prisma              # 9 modelos + enum ROLE
│   └── migrations/                # Migraciones versionadas
├── http/                          # Ejemplos REST Client por feature
├── src/
│   ├── server.ts                  # Entry point: app.listen + graceful shutdown
│   ├── app.ts                     # helmet, cors, body-parser, registerRoutes
│   │
│   ├── config/                    # Transversal, una responsabilidad por archivo
│   │   ├── env.ts                 # Variables validadas (JWT ≥ 32 chars)
│   │   ├── prisma.ts              # Singleton dbPrisma
│   │   ├── logger.ts              # pino (transport, redact de secretos)
│   │   ├── http-logger.ts         # pino-http (req.id, nivel por status)
│   │   ├── error-handler.ts       # mapea Zod/AppError/Multer/Prisma → HTTP
│   │   ├── graceful-shutdown.ts   # SIGTERM/SIGINT con cierre de Prisma
│   │   ├── cors.ts                # corsOptions + corsOriginGuard
│   │   ├── origins.ts             # allowlist + TRUST_BACKEND_ORIGINS
│   │   └── rate-limit.ts          # 4 limiters + isProgressPath
│   │
│   ├── core/                      # Compartido entre módulos
│   │   ├── errors/
│   │   │   └── AppError.ts        # class AppError(code, statusCode, message)
│   │   ├── http/
│   │   │   ├── validate.ts        # middleware Zod body/params/query
│   │   │   └── express.utils.ts   # bodyOf/paramsOf/queryOf tipados
│   │   ├── storage/
│   │   │   └── s3.client.ts       # S3Client para Cloudflare R2
│   │
│   ├── http/                      # Composición de rutas y health
│   │   ├── routes.ts              # registerRoutes: limiters + routers + 404
│   │   └── health.ts              # healthcheck DB + R2 con timeout de 2s
│   │
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── application/
│   │   │   │   ├── auth.service.ts            # login/register/refresh/logout/getSession/verify
│   │   │   │   └── common/
│   │   │   │       ├── auth.guard.ts          # requireAuth (cookie/Bearer/x-session-token)
│   │   │   │       ├── token.utils.ts         # firma/verificación de JWT + tokenFromHeaders
│   │   │   │       ├── cookie.utils.ts        # setAuthCookies/clearAuthCookies
│   │   │   │       ├── crypto.utils.ts        # bcrypt + código de verificación
│   │   │   │       └── email.utils.ts         # sendEmail (Resend) — ⚠️ sin usar
│   │   │   ├── domain/
│   │   │   │   ├── auth.entities.ts           # PublicUser, AuthResponse, TokenPayload...
│   │   │   │   └── auth.interface.ts          # IAuthRepository
│   │   │   ├── infrastructure/
│   │   │   │   └── auth.prisma.repository.ts  # implementación con Prisma
│   │   │   ├── presentation/
│   │   │   │   ├── auth.controller.ts         # handlers HTTP
│   │   │   │   ├── auth.dto.ts                # schemas Zod (register/login/verify...)
│   │   │   │   └── auth.routes.ts             # router puro
│   │   │   └── _tests_/
│   │   │       └── application/
│   │   │           └── auth.service.test.ts   # 25 tests con repositorio fake
│   │   ├── books/
│   │   │   ├── application/
│   │   │   │   ├── books.service.ts
│   │   │   │   └── common/
│   │   │   │       ├── books.utils.ts         # generateFileHash, normalizedFileName
│   │   │   │       └── books.storage.ts       # deleteR2Quietly
│   │   │   ├── domain/
│   │   │   │   ├── books.interface.ts         # IBooksRepository
│   │   │   │   ├── books.types.ts             # Book, UserBook, inputs
│   │   │   │   └── books.dto-types.ts         # upload/params/response DTOs
│   │   │   ├── infrastructure/
│   │   │   │   └── books.prisma.repository.ts
│   │   │   ├── presentation/
│   │   │   │   ├── books.controller.ts
│   │   │   │   ├── books.dto.ts               # schemas Zod (progress, params)
│   │   │   │   └── books.routes.ts
│   │   │   └── _tests_/
│   │   │       ├── application/books.service.test.ts
│   │   │       └── presentation/books.routes.test.ts   # HTTP con Supertest
│   │   ├── bookmarks/ ...     # misma forma: application, domain, infrastructure, presentation, _tests_
│   │   └── streak/ ...        # misma forma
│   │
│   ├── scripts/
│   │   └── seed.ts            # pnpm seed — usuario demo + sesión
│   ├── tests/
│   │   ├── fakes.ts           # makeXxxRepo + makeXxx data para todos los módulos
│   │   └── example.test.ts    # plantilla
│   └── types/
│       ├── express.d.ts       # augmentation de Express.Request.userId
│       └── auth.d.ts          # tipos globales de auth
├── jest.config.ts
├── tsconfig.json
└── package.json
```

> La carpeta `src/http/routes.ts` con el espacio literal en el nombre **ya no
> existe**: se renombró a `src/http/routes.ts` y quedó documentado en
> `specs/tasks/backend/04-codigo-muerto.md`.

---

## Capas por módulo

### `presentation/` — la frontera HTTP

| Archivo | Responsabilidad |
|---|---|
| `*.routes.ts` | Declara las rutas y sus validaciones. **No tiene lógica.** |
| `*.controller.ts` | Recibe `req/res`, resuelve el usuario (`req.userId` o params), llama al service, responde. |
| `*.dto.ts` | Schemas Zod de la frontera: validan lo que entra y tipan lo que sale. |

### `application/` — los casos de uso

| Archivo | Responsabilidad |
|---|---|
| `*.service.ts` | Orquesta repositorios, valida permisos, aplica reglas de negocio. **No conoce Express.** Emite `AppError`. |
| `common/*.utils.ts` | Utilidades de la feature (JWT, cookies, hash, hashing de archivos). |

Los services reciben su repositorio por constructor con un default, lo que
permite tests con fake sin tocar el total del sistema:

```ts
// modules/books/application/books.service.ts
const booksPrismaRepository = new BooksPrismaRepository();

export class BooksService {
  constructor(
    private readonly repo: IBooksRepository = booksPrismaRepository,
  ) {}
  // método de instancia; los controllers usan el singleton `booksService`
}
export const booksService = new BooksService();
```

### `domain/` — el idioma de la feature

| Archivo | Responsabilidad |
|---|---|
| `*.interface.ts` | Contrato de persistencia (`IBooksRepository`, `IAuthRepository`...). |
| `*.entities.ts` | Entidades y respuestas que salen del service. |
| `*.types.ts` | Tipos de entrada y del modelo. |
| `*.dto-types.ts` | (books) Tipos de request/params de la API. |

### `infrastructure/` — Prisma detrás de la interfaz

Un solo archivo por feature implementa la interfaz del dominio. Los métodos
son arrow functions bound, para que puedan pasarse a otras capas sin perder el
`this`:

```ts
export class BooksPrismaRepository implements IBooksRepository {
  getUserBooks = (userId: string) => dbPrisma.user_book.findMany({ ... });
}
```

---

## Flujo de una request

```
HTTP request
   ↓
config/rate-limit.ts ──(limiter por ruta)──┐
   ↓                                       │
http/routes.ts (registra routers)          │
   ↓                                       │
modules/<f>/presentation/*.routes.ts       │
   ↓                                       │
core/http/validate.ts (Zod: body/params)   │
   ↓                                       │
modules/<f>/presentation/*.controller.ts   │
   ↓                                       │
modules/<f>/application/*.service.ts  ←── auth.guard (req.userId)
   ↓
modules/<f>/domain/*.interface.ts
   ↓
modules/<f>/infrastructure/*.prisma.repository.ts
   ↓
Prisma → PostgreSQL / R2
```

Los módulos protegidos usan `auth.guard` (`modules/auth/application/common/auth.guard.ts`)
a nivel de router. El guard resuelve la sesión con `auth api.getSession`, que
acepta los cuatro transportes (cookie, Bearer, x-session-token, x-refresh-token).

---

## Errores

### `AppError` (core/errors/AppError.ts)

```ts
export class AppError extends Error {
  constructor(public code: string, public statusCode: number, message: string) {
    super(message);
  }
}
```

Los mensajes de error se escriben directo en cada `AppError`. Un intento de
centralizarlos en `core/errors/error-messages.ts` quedó sin consumidores y se
eliminó en `specs/tasks/backend/04-codigo-muerto.md`.

### `errorHandler` (config/error-handler.ts)

| Error | HTTP | Shape |
|---|---|---|
| `ZodError` | 400 | `{ error: "Validation failed", details: [{ path, message }] }` |
| `AppError` | `err.statusCode` | `{ error: err.message, code: err.code }` |
| `multer.MulterError` LIMIT_FILE_SIZE | 413 | `{ error, code }` |
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

## CORS (config/cors.ts + config/origins.ts)

- `origin: true` (refleja el origin) + `credentials: true`.
- `allowedHeaders`: `Content-Type`, `Authorization`, `x-session-token`, `x-refresh-token`.
- `corsOriginGuard`: rechaza (403) origins que no estén en la allowlist.
- Allowlist: `FRONTEND_URL` (env, separado por comas) + extras de dev (`localhost:3000/5173/8081/1420`, `tauri.localhost`, etc.).
- `TRUST_BACKEND_ORIGINS=true` permite confiar en origins cuyo host coincida con `X-Forwarded-Host`/`Host` (usado detrás de nginx en Docker).

---

## Logging

- `pino` (config/logger.ts) con `redact` de `authorization`, `cookie`, `password`, `secret` y `token`.
- `pino-http` (config/http-logger.ts) con `req.id` (respeta `x-request-id`), nivel por status y exclusión del health check.
- El `errorHandler` loguea los 500 explícitamente.

---

## Montaje de rutas (src/http/routes.ts)

```
GET    /api/v1/health                    (healthHandler: DB + R2)
POST   /api/v1/auth/*                    (authLimiter)
GET    /api/v1/auth/get-session          (sessionLimiter)
PATCH  /api/v1/books/:id/progress        (progressLimiter)
GET/POST/PATCH/DELETE /api/v1/books/*    (globalLimiter)
GET/POST/PATCH/DELETE /api/v1/books/:bookId/bookmarks/*
GET/POST /api/v1/streak/*
404 → { error: "Ruta no encontrada" }
errorHandler
```

---

## Convenciones de naming

| Concepto | Convención |
|---|---|
| Archivo de módulo | `<feature>.<capa>.ts` (kebab en `config/` y `core/`: `error-handler.ts`) |
| Service | `PascalCase` singular del feature + `Service` (`BooksService`), singleton `camelCase` (`booksService`) |
| Repositorio | `PascalCase` + `PrismaRepository` (`BooksPrismaRepository`) |
| Interfaz de repositorio | `I` + feature + `Repository` (`IBooksRepository`) |
| Controller | export de funciones `camelCase` (`updateBookmark`) |
| Schemas Zod | `PascalCase` + `Schema` (`UpdateBookmarkBodySchema`), en `*.dto.ts` |
| Errores | `AppError("CODE", status, "mensaje")` con codes en UPPER_SNAKE |
| Tests | Bajo `_tests_/application/` (service con fake) y `_tests_/presentation/` (HTTP con Supertest) |