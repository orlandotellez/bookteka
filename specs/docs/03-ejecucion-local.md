# 03 — Ejecución local

Todos los comandos salen de los `package.json`, `docker-compose.yml` y scripts del repo. No hay comandos inventados.

---

## Requisitos previos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 20 o superior (el repo usa 22) | Runtime del backend y build del frontend. |
| pnpm | 10.15 (`packageManager` en `backend-express/package.json`) | Package manager de los tres proyectos. |
| Docker + Docker Compose | v2 | Stack completo en contenedores. Opcional. |
| Rust + toolchain de Tauri | estable | Solo para `pnpm tauri dev/build` y para el build de Android. |
| Cuentas de terceros | — | Bucket de Cloudflare R2 y una API key de Resend. Sin ellos el backend no arranca: `config/env.ts` lanza al faltar cualquiera. |

---

## Opción A — Stack completo con Docker

```bash
git clone https://github.com/orlandotellez/bookteka.git
cd BOOKTEKA-REPO

cp .env.example .env
# Editar .env: JWT_SECRET, JWT_REFRESH_SECRET, R2_*, RESEND_*
```

Generar los secretos de JWT (mínimo 32 caracteres cada uno, valida `src/config/env.ts`):

```bash
openssl rand -hex 32
openssl rand -hex 32
```

```bash
docker compose up --build
```

| Servicio | Puerto host | Qué es |
|---|---|---|
| `db` | `5433` → 5432 | PostgreSQL 16. Healthcheck con `pg_isready`. |
| `backend` | `3001` → 3000 | Express. Espera a la DB, corre `prisma migrate deploy` y arranca. |
| `frontend` | `8081` → 8080 | Build de Vite servido con nginx, que proxya `/api/` al backend. |

El frontend en Docker recibe `VITE_API_URL=/api/v1` como build arg, así que el navegador siempre pega a su propio origin y las cookies de sesión viajan.

---

## Opción B — Por proyecto

### Backend

```bash
cd backend-express
cp .env.example .env          # completar DATABASE_URL, JWT_*, R2_*, RESEND_*
pnpm install
pnpm prisma:generate          # genera el cliente Prisma
pnpm dev                      # tsx watch en http://localhost:3000
```

Si la base de datos no está en Docker:

```bash
cd backend-express
npx prisma migrate dev        # crea la DB, aplica migraciones y genera el cliente
```

Si la base de datos **sí** está en Docker (`docker compose up db -d`), apuntá `DATABASE_URL` al puerto host `5433`:

```env
DATABASE_URL=postgres://bookteka:bookteka123@localhost:5433/bookteka_db?schema=public
```

### Frontend

```bash
cd frontend
cp .env.example .env
pnpm install
pnpm dev                      # Vite en http://localhost:1420 (strictPort)
```

`vite.config.ts` proxya `/api` hacia `BACKEND_HOST` (por defecto `http://localhost:3000`). Por eso el frontend usa URLs relativas y la cookie de sesión no se pierde.

| Target | Comando |
|---|---|
| Web | `pnpm dev` / `pnpm build` / `pnpm preview` |
| Desktop | `pnpm tauri dev` / `pnpm tauri build` |
| Android | `pnpm tauri android dev` / `pnpm tauri android build` |
| Simular producción en dev | `pnpm run production:mode` (fuerza el bootstrap remoto con `VITE_FORCE_PRODUCTION=true`) |

### Landing page

```bash
cd landing-page
pnpm install
pnpm dev                      # Astro en http://localhost:4321
```

> El `landing-page/README.md` heredado del starter de Astro menciona `bun`. Los scripts de `package.json` funcionan igual con `pnpm`.

---

## Pruebas

### Backend — Jest + Supertest

```bash
cd backend-express
pnpm test              # NODE_OPTIONS=--experimental-vm-modules jest
pnpm test:watch
```

| Suite | Cubre |
|---|---|
| `src/modules/books/_tests_/presentation/books.routes.test.ts` | Los 6 endpoints de libros vía HTTP. |
| `src/modules/books/_tests_/application/books.service.test.ts` | `BooksService` con repositorio fake. |
| `src/modules/bookmarks/_tests_/presentation/books.routes.test.ts` + `application/bookmarks.service.test.ts` | Marcadores por HTTP y por service. |
| `src/modules/streak/_tests_/presentation/streak.routes.test.ts` + `application/streak.service.test.ts` | Rachas por HTTP y por service. |
| `src/modules/auth/_tests_/application/auth.service.test.ts` | 25 tests de auth (el service no tenía ninguno). |
| `src/tests/example.test.ts` | Plantilla de test. |

Configuración en `jest.config.ts`: preset ESM, `testEnvironment: node`, alias `@/` resueltos por `moduleNameMapper`.

### Frontend — Vitest + Testing Library

```bash
cd frontend
pnpm exec vitest run
pnpm exec vitest
```

Configuración dentro de `vite.config.ts` (`test.environment: "jsdom"`, `setupFiles: "./src/test/setup.ts"`). **No hay script `test` en `frontend/package.json`**: hay que llamar a `vitest` explícitamente.

> Hay dos carpetas de setup: `src/test/setup.ts` (la que usa Vite) y `src/__tests__/setup.ts` (sin usar). Ver `specs/tasks/frontend/03-codigo-muerto.md`.

---

## Build / producción

| Proyecto | Comando | Salida |
|---|---|---|
| Backend | `pnpm build` | `dist/` — ejecuta `prisma generate && tsc && tsc-alias`. |
| Backend | `pnpm start` | Corre `node dist/server.js`. |
| Frontend web | `pnpm build` | `dist/` — ejecuta `tsc && vite build`. |
| Frontend Tauri | `pnpm tauri build` | Binario de escritorio. |
| Frontend Android | `pnpm tauri android build` | APK release. |
| Landing | `pnpm build` | `dist/` estático. |

> El backend se despliega en Railway (`backend-express/railway.toml`, builder `RAILPACK`). `docker-entrypoint.sh` espera a PostgreSQL y corre `prisma migrate deploy` antes de arrancar.

### Variables de entorno

| Proyecto | Archivo de ejemplo | Contiene |
|---|---|---|
| Raíz (compose) | `.env.example` | Lo que `docker-compose.yml` inyecta al backend. |
| Backend | `backend-express/.env.example` | Las 13 variables que lee `src/config/env.ts`. |
| Frontend | `frontend/.env.example` | `VITE_API_URL`, `BACKEND_HOST`, `VITE_BACKEND_HOST`. |

`src/config/env.ts` **falla al arrancar** si falta cualquiera de las variables, y exige `JWT_SECRET` y `JWT_REFRESH_SECRET` de 32 caracteres o más. La tabla completa está en `specs/tasks/backend/03-configuracion.md`.

---

## Verificación rápida de que todo anda

```bash
# 1. El backend responde y ve la DB y R2
curl http://localhost:3000/api/v1/health
# {"status":"ok","db":true,"r2":true,"timestamp":"..."}

# 2. La DB tiene las 9 tablas
docker compose exec db psql -U bookteka -d bookteka_db -c '\dt'
```

Si el health devuelve `503`, el `status` del campo que falló (`db` o `r2`) dice cuál de los dos es. `src/http/health.ts` loguea el motivo.

---

## Problemas frecuentes

| Síntoma | Causa probable | Dónde mirar |
|---|---|---|
| `Missing environment variable: R2_BUCKET` al arrancar | `.env` incompleto | `src/config/env.ts` |
| `JWT_SECRET must contain at least 32 characters` | Secreto corto o ausente | `getJwtSecret` en `src/config/env.ts` |
| `Origin no permitido por CORS: ...` | El origin no está en `FRONTEND_URL` | `src/config/origins.ts`, `DEV_EXTRA_ORIGINS` |
| `ECONNREFUSED` en el backend | La DB no está en `5433` | `docker compose ps` |
| El login entra y vuelve a `/auth/login` | La cookie de sesión no viaja (WebView Android) | `frontend/vite.config.ts` (proxy `/api`) y `frontend/src/lib/apiEnv.ts` |
| Vite no arranca en otro puerto | `strictPort: true` en `vite.config.ts` | Liberar el 1420 |
