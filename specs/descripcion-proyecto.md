# Bookteka — Descripción del Proyecto

**Bookteka** es una plataforma para gestionar y leer libros digitales (PDF) con seguimiento de progreso de lectura, rachas diarias, marcadores y subrayados. Disponible como app de escritorio (Tauri), app Android (Tauri WebView) y web.

---

## Stack tecnológico

| Capa | Tecnología | Versión |
|---|---|---|
| Backend principal | Node.js + Express + TypeScript | 5.x / 5.9 |
| ORM | Prisma | 6.x |
| Base de datos | PostgreSQL | 16 |
| Storage de PDFs | Cloudflare R2 (S3-compatible) | — |
| Emails transaccionales | Resend | 6.x |
| Frontend | React + Vite + TypeScript | 19 / 7 / 5.9 |
| Desktop + Android wrapper | Tauri | 2.x |
| Estado global | Zustand | 5.x |
| PDF rendering | PDF.js | 5.x |
| Persistencia offline | IndexedDB (idb) | 8.x |
| Landing page | Astro | 5.x |

El monorepo se compone de tres proyectos:

- `backend-express/` — API REST principal (Express + Prisma + JWT). **Fuente de verdad.**
- `frontend/` — SPA React + Vite con dual-target: navegador web y Tauri desktop/Android.
- `landing-page/` — Página de marketing estática (Astro).

---

## Modelo de negocio

- **Cuentas individuales**: cada usuario tiene su propia biblioteca. No hay multi-tenant. Roles: `user` (default del registro) y `admin` (sin uso funcional hoy).
- **Libros PDF**: se suben al storage (R2), se deduplican por hash SHA-256 (`book.fileHash @unique`), y cada usuario tiene un `user_book` con su progreso (página, scroll, tiempo de lectura).
- **Progreso de lectura**: `currentPage`, `scrollPosition`, `readingTimeSeconds`, `lastReadAt` por `user_book`.
- **Rachas diarias**: `user_streak` (1 por usuario). La racha se incrementa si leíste el día consecutivo y se reinicia a 1 si saltaste un día.
- **Offline-first**: la app guarda libros y progreso en IndexedDB; cuando hay sesión, sincroniza con la nube con merge (siempre se conserva el mayor de local vs cloud).

---

## Features del sistema

### Autenticación (JWT propio)

- `POST /auth/register` — registra usuario (bcrypt) + emite tokens + código de verificación.
- `POST /auth/login` — login con email/password.
- `POST /auth/refresh` — renueva tokens con **rotación real** (sesión single-use).
- `POST /auth/logout` — revoca la sesión y limpia cookies.
- `GET /auth/get-session` — devuelve la sesión actual.
- `POST /auth/verify-email` — verifica el correo con código de 6 caracteres.
- `POST /auth/resend-verification` — reenvía el código.

### Libros

- `GET /books` — lista libros del usuario (con progreso), ordenados por `lastReadAt`.
- `POST /books/upload` — sube PDF (multipart, máx 25MB) con deduplicación por hash.
- `GET /books/:id/download` — URL firmada de R2 (15 min).
- `GET /books/:id/stream` — stream del PDF (proxy anti-CORS).
- `PATCH /books/:id/progress` — actualiza progreso (página, scroll, tiempo, lastReadAt).
- `DELETE /books/:id` — elimina (de R2 solo si nadie más usa el libro) + auditoría.

### Marcadores

- `GET/POST /books/:bookId/bookmarks`, `DELETE /books/:bookId/bookmarks/:bookmarkId`.
- (El cliente tiene un PATCH de marcador pero el backend no lo implementa — los cambios quedan locales.)

### Rachas de lectura

- `GET /streak` — racha actual + `hasCompletedToday`.
- `POST /streak/complete` — marca el día completado (acepta `clientDate` para timezone del cliente).
- `POST /streak/initialize` — inicializa la racha con una fecha de inicio.

### Subrayados (highlights) — solo local

- Los highlights se guardan únicamente en IndexedDB (no hay endpoints en el backend).

---

## Multi-plataforma

| Plataforma | Build | API base URL |
|---|---|---|
| Web dev | `pnpm dev` (Vite :1420) | `/api/v1` (proxy de Vite → backend) |
| Web Docker | `docker compose up` (nginx :8081) | `/api/v1` (nginx proxya al backend) |
| Desktop dev | `pnpm tauri dev` | `/api/v1` (proxy de Vite) |
| Desktop/Android prod | `pnpm tauri build` / `tauri android build` | bootstrap remoto (`config-api.json`) o localStorage `BOOKTEKA_API_URL` |
| Android dev | `pnpm tauri android dev` | `VITE_BACKEND_HOST` + `/api/v1` (LAN, sin proxy) |

---

## Convenciones transversales de la API

- **Prefijo**: todos los endpoints van bajo `/api/v1`.
- **Auth**: cookies `accessToken` (15 min) y `refreshToken` (7 días), `httpOnly`; en Tauri los tokens viajan por `x-session-token`/`x-refresh-token`.
- **Errores**: `{ "error": "...", "code": "..." }` (AppError) o `{ "error": "Validation failed", "details": [...] }` (Zod).
- **Uploads**: `multipart/form-data` (campo `file` o `pdf`), máx 25 MB.
- **Health**: `GET /api/v1/health` (verifica DB + R2).

---

## Estructura del monorepo

```
BOOKTEKA-REPO/
├── backend-express/             # Backend principal (Express + Prisma)
│   ├── prisma/schema.prisma     # 9 modelos + enum ROLE
│   ├── prisma/migrations/       # Migraciones versionadas
│   ├── src/
│   │   ├── routes/              # auth, books, bookmarks, streak
│   │   ├── controllers/         # book, bookmark, streak
│   │   ├── services/            # lógica de negocio
│   │   ├── repositories/        # acceso a datos (interfaces)
│   │   ├── schema/              # Zod schemas
│   │   ├── dto/                 # book, bookmark (request/response/params)
│   │   ├── middleware/          # requireAuth, validate, errorHandler
│   │   ├── config/              # env, prisma, cors, rate-limit, shutdown
│   │   ├── lib/                 # auth, r2, email, logger, origins
│   │   └── helper/              # errors, format, time, express
│   ├── http/                    # Endpoints REST Client
│   └── doc/                     # Manual técnico (DOC.md, PRISMA.md)
│
├── frontend/                    # SPA (React + Vite + Tauri 2)
│   ├── src/
│   │   ├── api/                 # client.ts unificado + auth/books/bookmarks/streak
│   │   ├── components/          # pages/{reader,index,profile}, auth, modals, layout, common
│   │   ├── context/             # ThemeContext, AppBootstrap
│   │   ├── database/            # IndexedDB (idb) + features + sync
│   │   ├── store/               # bookStore, streakStore, userPreferencesStore (Zustand)
│   │   ├── hooks/               # useBooks, useReadingTimer
│   │   ├── lib/                 # sessionToken, sessionCache, api-config, fetch, pdfService
│   │   ├── pages/               # Index (Library), Profile, auth/{Login,Register}, NotFound
│   │   └── routes/              # AppRoutes, ProtectedRoute, PublicRoute
│   ├── src-tauri/               # Tauri 2 + gen/android (APK)
│   ├── index.html               # splash estático + script inline de tema
│   └── config-api.json          # URL de producción para el bootstrap
│
├── landing-page/                # Landing (Astro)
├── docker-compose.yml           # db + backend + frontend
└── specs/                       # Documentación del proyecto actual (USTED ESTÁ AQUÍ)
```

---

## Qué hay en `specs/`

```
specs/
├── descripcion-proyecto.md     # Este archivo
├── global-instruction.md       # Reglas para uso de IA en el repo
└── modules/
    ├── backend/                # Stack, arquitectura, convenciones
    ├── frontend/               # Stack, diseño, pantallas, arquitectura
    ├── api/                    # Especificación REST por feature
    └── db/                     # Schema, enums, use-cases, setup
```
