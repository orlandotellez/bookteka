# Backend Stack

Stack tecnológico del backend Express del Bookteka.

## Runtime

- **Node.js** — v20+ (recomendado v22+)
- **TypeScript** — 5.9 (strict, ESM `"type": "module"`)
- **pnpm** — 10.x (package manager)

## Core

| Paquete | Versión | Propósito |
|---|---|---|
| `express` | 5.x | Framework HTTP. Soporta async handlers con errores automáticos. |
| `cors` | 2.x | Middleware CORS (origin reflejado + guard de orígenes). |
| `helmet` | 8.x | Headers de seguridad HTTP. |
| `dotenv` | 17.x | Carga `.env`. |
| `pino` + `pino-http` | 10.x / 11.x | Logging estructurado con request logging. |

## Persistencia

| Paquete | Versión | Propósito |
|---|---|---|
| `@prisma/client` | 6.x | ORM tipado para PostgreSQL. |
| `pg` | 8.x | Pool de PostgreSQL nativo (healthcheck). |

> **Decisión**: Prisma es el único ORM. `config/db.ts` mantiene un pool `pg` solo para el healthcheck; toda la app usa `dbPrisma`.

## Auth

| Paquete | Versión | Propósito |
|---|---|---|
| `jsonwebtoken` | 9.x | Firmar/verificar JWT access (15min) y refresh (7d). |
| `bcrypt` | 6.x | Hash de passwords (cost 10). |

## Storage / Email

| Paquete | Versión | Propósito |
|---|---|---|
| `@aws-sdk/client-s3` | 3.x | Cliente S3 para Cloudflare R2 (PutObject, GetObject, DeleteObject). |
| `@aws-sdk/s3-request-presigner` | 3.x | URLs firmadas de descarga (15 min). |
| `multer` | 2.x | Upload multipart (memoryStorage, máx 25MB). |
| `resend` | 6.x | Cliente de email. **Integrado pero no usado**: `src/lib/email.ts` define `sendEmail()` y ningún archivo lo importa. La verificación de correo imprime el código con `console.info` en `lib/auth.ts` (`createVerification`). Ver `specs/tasks/backend/02-email-verificacion.md`. |

## Validación / Tipado

| Paquete | Versión | Propósito |
|---|---|---|
| `zod` | 4.x | Schemas de validación (`src/schema/`). |
| `tsc-alias` | 1.x | Resuelve alias `@/*` en el build. |
| `tsx` | 4.x | Ejecuta TS en dev (watch). |

## Testing

| Paquete | Versión | Propósito |
|---|---|---|
| `jest` + `@jest/globals` | 30.x | Test runner (ESM con `--experimental-vm-modules`). |
| `supertest` | 7.x | Tests HTTP de integración. |
| `ts-jest` | 29.x | Soporte TS en Jest. |
| `prisma` | 6.x | CLI de migraciones (devDependency). |

---

## Patrones clave

| Patrón | Implementación |
|---|---|
| **MVC + capas** | `Controller → Service → Repository`. Sin lógica de negocio en controllers ni queries en services. |
| **Repository Pattern** | Interfaz (`IBookRepository`) + clase (`BookRepository`) en `repositories/`. |
| **Service Layer** | Clases con **métodos de instancia** e inyección por constructor (`constructor(private readonly repo = repoPorDefecto)`), exportadas como singletons (`bookService`, `streakService`, `bookmarkService`). Los tests inyectan un repo fake con `new BookService(fakeRepo)`. **No son métodos estáticos.** |
| **DTO + Validation** | DTOs en `dto/` + Zod schemas en `schema/` validados por el middleware `validate`. |
| **Auth centralizada** | `lib/auth.ts` expone `auth.api.*` (getSession, login, register, refresh, logout, verifyEmail, createVerification) y `auth.cookies`. |
| **Error → Response** | `AppError` + `errorHandler` central. Shape: `{ error, code }`. |

---

## Decisiones arquitectónicas clave

1. **JWT stateless para access**: el access token NO se guarda en DB; `getSession` verifica el JWT y devuelve el token como "session". El refresh token SÍ se guarda en `session` con rotación single-use (compare-and-delete).
2. **Transporte de sesión dual**: cookies `httpOnly` (web) + headers `x-session-token`/`x-refresh-token` (Tauri, porque la WebView Android es cross-site y las cookies SameSite no viajan).
3. **Deduplicación de libros por hash**: si dos usuarios suben el mismo PDF, comparten el mismo `book` (se evita duplicar storage).
4. **Borrado físico con auditoría**: los libros se borran físicamente (R2 + fila) solo si nadie más los usa; cada borrado queda en `audit_log`.
5. **Rate limiting en 4 tiers**: auth (10/min), get-session (200/15min), progress (600/15min), global (100/15min).

---

## Build y desarrollo

```bash
# Watch mode
pnpm dev

# Build producción (prisma generate + tsc + tsc-alias)
pnpm build

# Tests
pnpm test

# Migraciones
pnpm prisma:generate
npx prisma migrate dev
npx prisma studio
```

> **ESM**: todos los imports locales terminan en `.js` (`import { env } from "@/config/env.js"`), aunque el archivo fuente sea `.ts`.
