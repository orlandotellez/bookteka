# 🟠 Ausencia de CI y de tests de seguridad

## Estado Actual

**No hay integración continua.** El directorio `.github/` no existe en el repositorio. No hay workflow, ni pre-commit, ni nada que ejecute los tests automáticamente. Los comandos existen (`pnpm test`, `pnpm build` en el backend; `pnpm exec vitest run`, `pnpm build` en el frontend) pero nada los corre por nosotros.

Consecuencia directa: un cambio puede mergearse con los tests rotos y nadie se entera hasta que alguien los ejecuta.

### Lo que sí está cubierto

El backend tiene 2.897 líneas de tests en 7 suites (`src/__tests__/`), con dos niveles: HTTP vía Supertest (`book.test.ts`, `bookmark.test.ts`, `streak.test.ts`) y service con repositorio fake (`book.service.test.ts`, `bookmark.service.test.ts`, `streak.service.test.ts`). La cobertura de reglas de negocio es decente: hay tests del progreso monotónico, de la deduplicación por hash, de la rotación de refresh token y de la concurrencia de la racha.

### Lo que no está cubierto

| Área | Gap |
|---|---|
| **Auth** | `src/lib/auth.ts` tiene 373 líneas y **cero tests**. No hay ningún test de `login`, `register`, `refresh`, `verifyEmail` ni `createVerification`. Es la pieza con más superficie de seguridad del backend. |
| **Configuración y env** | `src/config/env.ts` (validación de secretos, longitud mínima) sin test. |
| **CORS** | `src/config/cors.ts` + `src/lib/origins.ts` sin test. El reject de origin no permitido y el comportamiento de `TRUST_BACKEND_ORIGINS` no tienen verificación. |
| **Rate limiting** | `src/config/rate-limit.ts` sin test. |
| **Health check** | `src/http /health.ts` sin test: ni el 503 cuando R2 no responde, ni el timeout de 2s. |
| **Middleware de errores** | `src/middleware/errorHandler.ts` sin test del mapeo de códigos Prisma. |
| **Uploads** | No hay test del límite de 25MB ni del campo alias `file` vs `pdf`. |
| **Frontend** | 59 tests en 8 archivos. Sin cobertura de `streakStore`, `userPreferencesStore`, `api/*`, `database/sync.ts`, `routes/*` ni de la vista `reader/`. Ver `specs/tasks/frontend/01-cobertura-tests.md`. |
| **Mensaje de error desactualizado** | `src/middleware/errorHandler.ts` responde `"...(20MB)"` cuando el límite de Multer en `src/routes/book.routes.ts` es 25MB. El spec ya lo marca, el código no. |

### ESLint no está configurado

`frontend/package.json` declara `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` y `globals` como devDependencies, pero **no existe `eslint.config.js` ni `.eslintrc`**. `pnpm exec eslint` no tiene contra qué trabajar. Tampoco hay linter en el backend.

### Comandos de CI que faltan

- `pnpm test` en el backend.
- `pnpm exec vitest run` en el frontend.
- `pnpm build` en ambos (el build del frontend corre `tsc`, así que es el typecheck).
- `prisma migrate status` para detectar drift entre `schema.prisma` y las migraciones.
- `prisma validate`.

## Objetivo

Que ningún cambio pueda mergearse con los tests rotos, que el typecheck se ejecute siempre, y que las rutas de auth, CORS y rate limiting tengan verificación.

## Alcance

- Workflow de CI que corra los comandos que ya existen.
- Tests de auth, CORS, env y health.
- Corregir el mensaje del 413.
- Configurar ESLint en el frontend.

## Fuera de alcance

- Subir la cobertura a un umbral numérico: primero hay que medirla.
- Pre-commit hooks (la CI alcanza para empezar).
- Linter en el backend (ver tarea 5).
- Deploy automático: hoy Railway despliega con `RAILPACK` (`backend-express/railway.toml`).

## Tareas

- [ ] 1. Agregar el workflow de CI
  - Crear `.github/workflows/ci.yml` con dos jobs: `backend` y `frontend`, ambos `on: [push, pull_request]`.
  - `backend`: `pnpm install --frozen-lockfile` → `pnpm prisma:generate` → `npx prisma validate` → `pnpm test` → `pnpm build`.
  - `frontend`: `pnpm install --frozen-lockfile` → `pnpm exec vitest run` → `pnpm build`.
  - `landing-page`: `pnpm install --frozen-lockfile` → `pnpm build` (es barato y hoy nadie lo compila).
  - `prisma migrate status` necesita una base de datos. Levantar un servicio `postgres:16-alpine` en el job, o al menos correr `prisma validate` que no la necesita.
- [ ] 2. Subir `npx prisma validate` y `prisma migrate status` al pipeline
  - Detectar drift entre `schema.prisma` y `prisma/migrations/` es un error que hoy nadie ve hasta que Prisma falla en runtime.
- [ ] 3. Testear `src/lib/auth.ts`
  - `login`: credenciales válidas, email inexistente, password incorrecto, usuario con `deleted_at` seteado (debe rechazar).
  - `register`: email duplicado (409), creación del par `user` + `account` en transacción, emisión de sesión.
  - `refresh`: rotación (el token viejo deja de servir), token expirado, token sin sesión en DB, refresh concurrente (solo uno gana).
  - `verifyEmail`: código válido, código expirado, código inexistente.
  - Los tests pueden reutilizar el patrón de `book.service.test.ts`: pasar un cliente fake por el parámetro `client` de `issueTokens` y `createSession`, que ya existe para eso.
- [ ] 4. Testear CORS, env y health
  - `src/lib/origins.ts`: origin permitido, origin rechazado, `FRONTEND_URL` con `*` (debe lanzar), `TRUST_BACKEND_ORIGINS` activo e inactivo.
  - `src/config/env.ts`: variable faltante lanza, secreto JWT de menos de 32 caracteres lanza, secreto válido pasa.
  - `src/http /health.ts`: DB y R2 OK devuelve 200; cualquiera caído devuelve 503 con el campo correspondiente en `false`.
- [ ] 5. Corregir el mensaje del 413
  - En `src/middleware/errorHandler.ts`, cambiar `"...(20MB)"` por el valor real. Mejor: derivarlo de la constante del límite, que hoy está inline en `src/routes/book.routes.ts` como `25 * 1024 * 1024`. Extraer la constante a un lugar compartido y usarla en ambos.
- [ ] 6. Configurar ESLint en el frontend
  - Crear `frontend/eslint.config.js` con el flat config usando las dependencias ya instaladas: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
  - Agregar el script `"lint": "eslint ."` a `frontend/package.json`.
  - Agregar el job de lint a la CI.
  - Arrancar con las reglas que el proyecto ya declara en `specs/global-instruction.md`: `no-unused-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`.
  - El código actual probablemente no pase `react-refresh/only-export-components` ni `no-unused-vars` (hay imports y helpers sin usar). Planificar arreglar los errores, no desactivar la regla.
- [ ] 7. Agregar el test de límite de upload
  - Un PDF de más de 25MB debe devolver 413. Requiere un fixture grande o mockear Multer; decidir al implementarlo.

## Criterios de Done

- [ ] Un PR que rompa un test falla la CI.
- [ ] `pnpm build` del frontend corre en la CI, así que el typecheck es obligatorio para mergear.
- [ ] `src/lib/auth.ts`, `src/lib/origins.ts`, `src/config/env.ts` y `src/http /health.ts` tienen tests.
- [ ] El mensaje del 413 dice el tamaño real y ese valor viene de una constante compartida.
- [ ] `pnpm lint` en el frontend funciona y pasa.
- [ ] La cobertura se mide una vez y el número queda anotado en `specs/modules/backend/05-testing.md`.
