# Backend Configuration

Variables de entorno, archivos de configuración y cómo se manejan los secretos.

> Fuente de verdad: `src/config/env.ts`. Si algo no coincide con esa tabla, el código gana.

---

## Variables de entorno

`src/config/env.ts` lee el entorno con `dotenv` y valida **al arrancar**. Si falta una variable obligatoria, lanza `Missing environment variable: <key>` y el proceso muere. Es deliberado: es preferible que el backend no levante a que falle en runtime con un error confuso.

| Variable | Clave en `env.ts` | Obligatoria | Default | Para qué |

|---|---|---|---|---|
| `PORT` | `PORT` | No | `3000` | Puerto del servidor. |
| `DATABASE_URL` | `DATABASE_URL` | **Sí** | — | DSN de PostgreSQL. |
| `FRONTEND_URL` | `FRONTEND_URL` | **Sí** | — | Allowlist de CORS, separada por comas. |
| `JWT_SECRET` | `JWT_SECRET` | **Sí** | — | Firma del access token. Mínimo 32 caracteres. |
| `JWT_REFRESH_SECRET` | `JWT_REFRESH_SECRET` | **Sí** | — | Firma del refresh token. Mínimo 32 caracteres, distinto del anterior. |
| `R2_ACCESS_KEY_ID` | `R2_ACCESS_KEY_ID` | **Sí** | — | Credencial de Cloudflare R2. |
| `R2_SECRET_ACCESS_KEY` | `R2_SECRET_ACCESS_KEY` | **Sí** | — | Credencial de R2. |
| `R2_ENDPOINT` | `R2_ENDPOINT` | **Sí** | — | Endpoint S3 de R2. |
| `R2_BUCKET` | `R2_BUCKET` | **Sí** | — | Bucket donde viven los PDFs. |
| `R2_PUBLIC_DOMAIN` | `R2_PUBLIC_DOMAIN` | **Sí** | — | Dominio público, para armar `fileUrl`. |
| `RESEND_API_KEY` | `RESEND_API_KEY` | **Sí** | — | API key de Resend. **Hoy no se usa.** |
| `RESEND_FROM_EMAIL` | `RESEND_FROM_EMAIL` | **Sí** | — | Remitente. **Hoy no se usa.** |

### Variables fuera de la interfaz de `env`

Se leen directamente de `process.env`, sin validación:

| Variable | Dónde | Default | Para qué |
|---|---|---|---|
| `NODE_ENV` | `lib/auth.ts`, `lib/logger.ts`, `lib/origins.ts` | — | Decide cookies `secure`/`sameSite`, nivel de log, y si se permite `*` en la allowlist. |
| `LOG_LEVEL` | `lib/logger.ts` | `info` en producción, `debug` en desarrollo | Nivel de `pino`. |
| `TRUST_BACKEND_ORIGINS` | `lib/origins.ts` | `false` | Si es `true`, confía en origins cuyo host coincida con `X-Forwarded-Host`. |
| `DATABASE_URL` (Prisma) | `prisma/schema.prisma` | — | La lee Prisma por su cuenta, directo del entorno. |

> Las claves internas de `env` coinciden con los nombres de las variables:
> `env.R2_ACCESS_KEY_ID` viene de `R2_ACCESS_KEY_ID`, etc. Antes había un mapeo
> intermedio (`R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_S3_API`) que se eliminó en
> `specs/tasks/backend/03-configuracion.md` tarea 2.
>
> **Los tests son herméticos**: `src/tests/setup.ts` inyecta las variables
> (Jest `setupFiles`), así que la suite corre sin `.env` local. Verificado:
> 123/123 tests con el `.env` fuera.

---

## Validación de secretos

`getJwtSecret` en `src/config/env.ts` aplica dos reglas:

1. Si el valor no existe y `NODE_ENV === "test"`, devuelve un secreto de prueba hardcodeado.
2. Si el valor no existe o tiene menos de **32 caracteres**, lanza `JWT_SECRET must contain at least 32 characters`.

La regla 1 es una puerta conocida: si un entorno desplegado queda con `NODE_ENV=test`, el backend arranca con un secreto público. El plan está en `specs/tasks/backend/03-configuracion.md` tarea 3.

---

## Archivos de configuración

### `src/config/env.ts`
Valida y exporta el objeto `env`. Lo importan casi todos los módulos que necesitan configuración.

### `src/config/prisma.ts`
Cliente singleton de Prisma:
```ts
const globalForPrisma = global as unknown as { prisma: PrismaClient };
export const dbPrisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = dbPrisma;
```
El cache en `globalThis` evita crear un cliente nuevo en cada hot reload de `tsx watch`.

### `src/config/cors.ts`
`corsOptions` + `corsOriginGuard`. Detalle en [04-security](./04-security.md).

### `src/config/rate-limit.ts`
Los cuatro limiters y `isProgressPath`. Detalle en [04-security](./04-security.md).

### `src/config/http-logger.ts`
`pino-http` con `genReqId` (respeta el header `x-request-id` si viene, si no genera un UUID, y lo devuelve en la respuesta), nivel automático por status y exclusión del health check del log.

### `src/config/graceful-shutdown.ts`
Cierre ordenado en `SIGTERM`/`SIGINT`: cierra el server y desconecta Prisma, con un timeout forzado de 10 segundos. También maneja `unhandledRejection` (loguea) y `uncaughtException` (loguea, hace flush y sale con código 1).

### `src/config/prisma.ts`
Pool de `pg`. **No lo usa nadie** — `rg "from 'pg'" src` devuelve solo este archivo. Ver `specs/tasks/backend/04-codigo-muerto.md` tarea 1.

---

## Archivos `.env`

Hay tres ejemplos y ninguno coincide con los demás:

| Archivo | Para quién |
|---|---|
| `.env.example` (raíz) | Lo que inyecta `docker-compose.yml` al servicio `backend`. |
| `backend-express/.env.example` | Desarrollo local del backend. |
| `frontend/.env.example` | Desarrollo local del frontend (variables `VITE_*`). |

Discrepancias a corregir, en `specs/tasks/backend/03-configuracion.md`:

- `TRUST_BACKEND_ORIGINS` falta en el `.env.example` de la raíz, aunque `docker-compose.yml` lo usa.
- `FRONTEND_URL` apunta a `http://localhost:5173` en el `.env.example` del backend, pero Vite corre en `1420`.
- Los nombres de las variables de R2 no coinciden con las claves internas de `env.ts`.

---

## Gestión de secretos

### Estado actual

| Aspecto | Estado |
|---|---|
| Valores en el repo | **Ninguno.** `git ls-files` solo devuelve los tres `.env.example`. |
| `.gitignore` | Raíz con `.env`; `backend-express/.gitignore` con `.env`, `node_modules`, `dist`; `frontend/.gitignore` además con `*.apk` y `*.keystore`. |
| Keystore de Tauri | `frontend/bookteka.keystore` está en disco pero **no trackeado**. |
| APKs | Los dos APKs de ~53MB en `frontend/` **no están trackeados**. |
| Redacción en logs | `pino` redacta `authorization`, `cookie`, `password`, `secret`, `token`. |
| En respuestas HTTP | `publicUser()` construye el objeto que sale en las respuestas de auth y **no incluye** `password` ni los tokens de `account`. |

### Cómo generar los secretos de JWT

```bash
openssl rand -hex 32   # para JWT_SECRET
openssl rand -hex 32   # para JWT_REFRESH_SECRET (distinto del anterior)
```

### Variables por entorno

| Variable | Desarrollo | Producción |
|---|---|---|
| `PORT` | `3000` | Railway lo define. |
| `DATABASE_URL` | `localhost:5433` (host) o `db:5432` (red de compose) | Railway. |
| `FRONTEND_URL` | `http://localhost:5173` o `:1420` | Dominio real de la app. |
| `JWT_*` | Secrets de desarrollo | Secrets de producción, distintos. |
| `R2_*` | Mismo bucket de desarrollo | Bucket de producción. |
| `RESEND_*` | Clave de desarrollo | Clave de producción. |
| `TRUST_BACKEND_ORIGINS` | No importa | **Solo si hay un proxy de confianza delante.** |
| `NODE_ENV` | development / test | `production` |

> La diferencia de `NODE_ENV` cambia comportamiento de verdad, no solo el log: cookies `secure` y `sameSite: none`, y la lista de CORS deja de incluir los extras de desarrollo.

---

## Despliegue

### Railway

`backend-express/railway.toml`:
```toml
[build]
builder = "RAILPACK"
```

### Docker

`backend-express/docker-entrypoint.sh`:
1. Espera a PostgreSQL con `pg_isready` en loop.
2. Corre `prisma migrate deploy`.
3. `exec "$@"` para arrancar el servidor.

`docker-compose.yml` define tres servicios: `db` (PostgreSQL 16 con healthcheck), `backend` (build desde `./backend-express`) y `frontend` (build desde `./frontend`, nginx que proxya `/api/`).

Las credenciales de PostgreSQL están en texto plano en el compose (`bookteka` / `bookteka123`). Es aceptable para desarrollo local, pero hay que dejarlo aclarado: ese compose es para la máquina de desarrollo, no para un despliegue.
