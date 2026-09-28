# Backend Module

Documentación del backend **Bookteka** — backend principal en Express (Node.js + TypeScript + Prisma + PostgreSQL).

## Contents

1. [01-stack](./01-stack.md) — Stack tecnológico y dependencias
2. [02-architecture](./02-architecture.md) — Estructura MVC + servicios + repositorios, errores
3. [03-api](./03-api.md) — Convenciones REST transversales
4. [04-security](./04-security.md) — Auth, autorización, validación, secretos, rate limit, CORS
5. [05-testing](./05-testing.md) — Qué cubren las 7 suites y qué no cubre nada
6. [06-configuracion](./06-configuracion.md) — Variables de entorno y manejo de secretos
7. [07-integraciones](./07-integraciones.md) — Cloudflare R2, PostgreSQL, Resend

## Quick start

```bash
# Desde backend-express/
pnpm install
cp .env.example .env          # Configurar variables
pnpm prisma:generate          # Generar cliente Prisma
pnpm dev                      # Inicia en modo desarrollo (puerto 3000)
```

Variables de entorno requeridas (ver `src/config/env.ts`):

```
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/bookteka_db?schema=public
FRONTEND_URL=http://localhost:5173
JWT_SECRET=<32+ chars>
JWT_REFRESH_SECRET=<32+ chars (distinto)>
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=...
R2_PUBLIC_DOMAIN=...
R2_BUCKET=...
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=onboarding@resend.dev
```

## Estado actual

El backend Express cubre auth, books, bookmarks, streak y health. Dos pendientes conocidos que hay que tener presentes al trabajar:

- **Los emails no se envían.** `src/modules/auth/application/common/email.utils.ts` implementa `sendEmail()` con Resend, pero ningún archivo lo importa; el código de verificación se imprime por consola (`src/modules/auth/application/auth.service.ts` → `createVerification`).
- **Falta `PATCH /books/:bookId/bookmarks/:bookmarkId`.** El cliente lo llama (`frontend/src/api/bookmark.ts`) y el backend no lo tiene, así que renombrar un marcador solo se guarda en IndexedDB.

Detalle y plan de arreglo en `specs/tasks/backend/`.
