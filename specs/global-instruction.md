# Global Instruction — Bookteka

Reglas transversales que toda IA (o humano) debe respetar al generar, modificar o auditar código en este repositorio.

> **Cómo usar este archivo**: compartido al inicio de cada sesión con la IA. Mantiene un tono consistente y evita sobreingeniería.

---

## Filosofía

1. **Simple > clever**. Si una feature se puede resolver con 30 líneas claras, no uses CQRS, microservicios ni MessageBus.
2. **Capitalizo lo existente**. Antes de crear un módulo nuevo, buscá uno similar. Reutiliza helpers, tipos, contratos.
3. **Backend = MVC con capa de servicios y repositorios**. `Controller → Service → Repository`. NO lógica de negocio en controllers ni queries en services.
4. **Cambio chico y verificable**. Un comportamiento nuevo entra con su test; una refactorización grande entra en pasos verificables. Sin reescrituras totales.

---

## Convenciones backend Express (`backend-express/`)

- **Framework**: Express 5 (soporta async handlers con errores automáticos).
- **Módulos ESM**: `"type": "module"`. Todos los imports locales terminan en `.js` aunque el archivo fuente sea `.ts` (`import { env } from "@/config/env.js"`).
- **Alias**: `@/*` → `src/*` (tsconfig paths + tsc-alias en build).
- **DB**: Prisma 6 + PostgreSQL 16. Cliente singleton `dbPrisma` (`config/prisma.ts`).
- **Validación**: Zod 4. Schemas en `src/modules/<feature>/presentation/<feature>.dto.ts`. Se validan con el middleware `validate` (`core/http/validate.ts`).
- **Errores**: clase `AppError(code, statusCode, message)` en `helper/errors.ts`. El `errorHandler` central mapea:
  - `ZodError` → 400 `{ error: "Validation failed", details: [...] }`
  - `AppError` → `{ error: message, code }`
  - `multer.MulterError` → 413/400
  - `Prisma` P2002/P2025/P2003 → 409/404/400
  - resto → 500 `{ error: "Internal Server Error", requestId }`
- **Auth**: JWT propio. Access 15 min + refresh 7 días con **rotación real** (compare-and-delete de la sesión). Passwords con bcrypt (cost 10). Todo centralizado en `lib/auth.ts` (`auth.api.*`).
- **Transporte de tokens**: cookies `httpOnly` (`accessToken`/`refreshToken`) + headers `Authorization: Bearer`, `x-session-token`, `x-refresh-token` (Tauri).
- **Storage**: Cloudflare R2 (S3-compatible) con `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`. Uploads con Multer (memoryStorage, máx 25MB).
- **Email**: Resend (`lib/email.ts`). ⚠️ `sendEmail()` está implementado pero **nadie lo llama**: el código de verificación se imprime por consola (`lib/auth.ts` → `createVerification`). No des por hecho que los emails salen.
- **Rate limit**: `express-rate-limit` (`config/rate-limit.ts`): auth 10/min, get-session 200/15min, progress 600/15min, global 100/15min.
- **Seguridad**: helmet + CORS con guard de orígenes (`config/cors.ts`, `lib/origins.ts`).
- **Logging**: pino + pino-http.
- **Estructura por feature** (modulos verticales, replicar exactamente):
  ```
  src/
  ├── modules/<feature>/
  │   ├── application/     # servicio + common/ (utils de la feature)
  │   ├── domain/          # entities, types, interfaz del repositorio
  │   ├── infrastructure/  # <feature>.prisma.repository.ts
  │   ├── presentation/    # controller, dto (Zod), routes
  │   └── _tests_/         # application/ (service) y presentation/ (HTTP)
  ├── config/          # env, prisma, logger, error-handler, graceful-shutdown, cors, origins, rate-limit
  ├── core/            # errors, http/validate, storage/s3.client
  ├── http/            # routes.ts (composicion), health.ts
  ├── scripts/         # seed.ts
  ├── tests/           # fakes.ts, example
  └── types/           # express.d.ts, auth.d.ts
  ```
  El detalle: `specs/modules/backend/02-architecture.md`.
- **Naming**: `camelCase` archivos y funciones, `PascalCase` clases, `UPPER_SNAKE` constantes. Sufijos `*Routes`, `*Controller` (funciones exportadas), `*Service` (clase static), `*Repository` (clase).
- **No devolver** `password`, `refresh_token` ni `account` al cliente.

---

## Convenciones frontend (`frontend/`)

- **Stack**: React 19 + Vite 7 + TypeScript estricto + Tauri 2 (desktop + Android vía `src-tauri/gen/android`).
- **Routing**: React Router 7. `PublicRoute`/`ProtectedRoute` envuelven las rutas. Vista de lector manejada por el `Layout` según `currentView` del store.
- **Estado global**: Zustand (`store/bookStore.ts`, `store/streakStore.ts`, `store/userPreferencesStore.ts`). Estado local: `useState`/`useReducer`.
- **API**: módulos en `src/api/<feature>.ts` sobre el client unificado `src/api/client.ts` (fetch/crossFetch, `ApiError`, headers `x-session-token`/`x-refresh-token`, FormData, `api.raw()` para binarios, keepalive). **Nunca** fetch directo en pages.
- **Errores**: `ApiError` con `status` + `message` extraído de `{ error | message }`. Mostrar via toast de `sonner` o inline en forms.
- **Auth**: `authApi` (`src/api/auth.ts`) + `sessionCache` (TTL 5min) + tokens en localStorage (`bookteka.access_token` / `bookteka.refresh_token`). En web las cookies también viajan.
- **Persistencia local**: IndexedDB con `idb` (`src/database/`). El cloud (cuando hay sesión) es la fuente de verdad; lo local es caché offline con merge de progreso.
- **Tema**: CSS vars en `index.css` con `data-theme` en `body` (`ThemeWrapper`). Temas definidos: `light`, `dark`, `midnight`, `sepia`, `ocean`, `forest` (solo light/dark seleccionables desde TS hoy).
- **Estilos**: CSS Modules (`PascalCase.module.css`). NO Tailwind, NO styled-components, NO Emotion.
- **Formularios**: react-hook-form + `@hookform/resolvers/zod` cuando hay >3 campos.
- **Splash**: `index.html` tiene splash estático + script inline de tema; `AppBootstrap` (`context/AppBootstrap.tsx`) resuelve la URL de la API (bootstrap remoto `config-api.json`).

---

## Convenciones de DB (Prisma → PostgreSQL)

- **UUID** para PKs (`@id @default(uuid())`).
- **Soft-delete**: solo en `users.deleted_at TIMESTAMPTZ NULL`. Los libros usan delete físico con auditoría.
- **Timestamps**: `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, `updated_at @updatedAt`.
- **Deduplicación de libros**: `book.fileHash @unique` (SHA-256 del contenido). Si dos usuarios suben el mismo PDF comparten el mismo `book`.
- **Relación usuario-libro**: `user_book @@unique([userId, bookId])` — un `user_book` por par.
- **FKs con cascade**: `session/account → user` (Cascade), `user_book → user/book` (Cascade), `bookmark → user_book` (Cascade).
- **Índices**: en todas las FKs + campos de búsqueda (`email`, `role`, `fileHash`, `userId`, `bookId`).
- **Migraciones**: NUNCA editar una migración aplicada; crear una nueva con `prisma migrate dev`.

---

## Convenciones API generales

- Versionado: `/api/v1/...`.
- Health: `GET /api/v1/health` (DB + R2).
- `Content-Type: application/json` salvo uploads (multipart) y streams (application/pdf).
- Auth por cookie httpOnly + headers `x-session-token`/`x-refresh-token`/`Authorization: Bearer`.
- Errores: shape `{ error: "mensaje", code: "..." }` (AppError), `{ error, details }` (Zod). No leakear stack.
- Fechas: ISO-8601 strings en respuestas; timestamps numéricos en la lista de libros (`createdAt`/`lastReadAt` en ms).
- Límite de upload: 25 MB por PDF.

---

## Cómo usar estos specs con IA

1. Antes de pedir un cambio, decile a la IA: *"Leé `specs/descripcion-proyecto.md` y `specs/modules/api/<feature>.md` para entender el contexto."*
2. Para cambios de backend, compartir `specs/modules/backend/02-architecture.md` y `03-api.md`.
3. Para cambios de DB, el archivo en `specs/modules/db/schemas/<tabla>.md` es la fuente de verdad; actualizar ambos lados si cambia.
4. Para tocar una feature, abrir su spec de `specs/modules/api/` y su `specs/tasks/<módulo>/` correspondiente.

---

## NO HACER

- ❌ No usar `any` en TS (usar `unknown` + narrowing). Sin `// @ts-ignore`.
- ❌ No escribir queries de negocio en los controllers ni en los services directamente (siempre vía repositories).
- ❌ No devolver `password`/`refresh_token` al cliente en responses.
- ❌ No agregar features que no estén en los specs sin antes actualizar el spec correspondiente.
- ❌ No romper el flujo de sesión: los 4 transportes (cookie, Bearer, x-session-token, x-refresh-token) deben seguir funcionando.
- ❌ No usar MediatR, ni buses, ni CQRS, ni DDD táctico (Aggregates, Value Objects), salvo que el spec lo indique.
- ❌ No commitear con secretos. `.env` siempre fuera del repo.
- ❌ No romper la sesión asumiendo un solo transporte: cookie, `Authorization: Bearer`, `x-session-token` y `x-refresh-token` tienen que seguir funcionando.
