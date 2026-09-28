# 🟠 Ausencia de CI y de tests de seguridad

## Estado Actual

**No hay integración continua.** El directorio `.github/` no existe en el repositorio. No hay workflow, ni pre-commit, ni nada que ejecute los tests automáticamente. Los comandos existen (`pnpm test`, `pnpm build` en el backend; `pnpm exec vitest run`, `pnpm build` en el frontend) pero nada los corre por nosotros.

Consecuencia directa: un cambio puede mergearse con los tests rotos y nadie se entera hasta que alguien los ejecuta.

### Lo que sí está cubierto

El backend tiene 119 tests en 8 suites (uno por servicio + uno por capa HTTP + los de auth):, con dos niveles por feature, bajo `_tests_/presentation/` (HTTP vía Supertest) y `_tests_/application/` (service con repositorio fake de `src/tests/fakes.ts`). La cobertura de reglas de negocio es decente: hay tests del progreso monotónico, de la deduplicación por hash, de la rotación de refresh token y de la concurrencia de la racha.

### Lo que no está cubierto

| Área | Gap |
|---|---|
| **Auth (HTTP + integración)** | `modules/auth/application/auth.service.ts` tiene 25 tests de service (`_tests_/application/auth.service.test.ts`, agregados con el refactor a módulos) pero los handlers HTTP y el guard no tienen tests de ruta. |
| **Configuración y env** | `src/config/env.ts` (validación de secretos, longitud mínima) sin test. |
| **CORS** | `src/config/cors.ts` + `src/config/origins.ts` sin test. El reject de origin no permitido y el comportamiento de `TRUST_BACKEND_ORIGINS` no tienen verificación. |
| **Rate limiting** | `src/config/rate-limit.ts` sin test. |
| **Health check** | `src/http/health.ts` sin test: ni el 503 cuando R2 no responde, ni el timeout de 2s. |
| **Middleware de errores** | `src/config/error-handler.ts` sin test del mapeo de códigos Prisma. |
| **Uploads** | No hay test del límite de 25MB ni del campo alias `file` vs `pdf`. |
| **Frontend** | 59 tests en 8 archivos. Sin cobertura de `streakStore`, `userPreferencesStore`, `api/*`, `database/sync.ts`, `routes/*` ni de la vista `reader/`. Ver `specs/tasks/frontend/01-cobertura-tests.md`. |
| **Mensaje de error desactualizado** | `src/config/error-handler.ts` responde `"...(20MB)"` cuando el límite de Multer en `src/modules/books/presentation/books.routes.ts` es 25MB. El spec ya lo marca, el código no. |

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

- [x] 1. Agregar el workflow de CI
  - Crear `.github/workflows/ci.yml` con dos jobs: `backend` y `frontend`, ambos `on: [push, pull_request]`.
  - `backend`: `pnpm install --frozen-lockfile` → `pnpm prisma:generate` → `npx prisma validate` → `pnpm test` → `pnpm build`.
  - `frontend`: `pnpm install --frozen-lockfile` → `pnpm exec vitest run` → `pnpm build`.
  - `landing-page`: `pnpm install --frozen-lockfile` → `pnpm build` (es barato y hoy nadie lo compila).
  - `prisma migrate status` necesita una base de datos. Levantar un servicio `postgres:16-alpine` en el job, o al menos correr `prisma validate` que no la necesita.
- [x] 2. Subir la validación de Prisma al pipeline
  - `prisma validate` (sin DB) + `prisma migrate deploy` contra un servicio `postgres:16-alpine` del job. El deploy aplica las migraciones y falla si hay drift o migraciones corruptas: es la señal más fuerte sin exigir `migrate status` en cada run.
  - Detectar drift entre `schema.prisma` y `prisma/migrations/` es un error que hoy nadie ve hasta que Prisma falla en runtime.
- [x] 3. Testear la capa HTTP de auth
  - Nuevo `_tests_/presentation/auth.routes.test.ts` (11 tests): register 201/409, login 200/401, refresh con rotación/consumido/sin token, get-session 200/401, verify-email 200/401. Patrón: el singleton `authPrismaRepository` del módulo de infra se reemplaza por `makeAuthRepo` con `jest.unstable_mockModule`.
  - `login`: credenciales válidas, email inexistente, password incorrecto, usuario con `deleted_at` seteado (debe rechazar).
  - `register`: email duplicado (409), creación del par `user` + `account` en transacción, emisión de sesión.
  - `refresh`: rotación (el token viejo deja de servir), token expirado, token sin sesión en DB, refresh concurrente (solo uno gana).
  - `verifyEmail`: código válido, código expirado, código inexistente.
  - Los tests pueden reutilizar el patrón de `book.service.test.ts`: pasar un cliente fake por el parámetro `client` de `issueTokens` y `createSession`, que ya existe para eso.
- [x] 4. Testear CORS, env y health
  - `env.ts` refactor: `buildEnv(processEnv)` pura + singleton; 6 tests de `src/tests/env.test.ts` (falta variable, JWT corto, validación).
  - `src/tests/origins.test.ts` (5 tests): allowlist dev, reject, `*` al cargar, `TRUST_BACKEND_ORIGINS` on/off.
  - `src/tests/health.test.ts` (3 tests): 200 ok, 503 db caído, 503 r2 caído.
  - `src/config/origins.ts`: origin permitido, origin rechazado, `FRONTEND_URL` con `*` (debe lanzar), `TRUST_BACKEND_ORIGINS` activo e inactivo.
  - `src/config/env.ts`: variable faltante lanza, secreto JWT de menos de 32 caracteres lanza, secreto válido pasa.
  - `src/http/health.ts`: DB y R2 OK devuelve 200; cualquiera caído devuelve 503 con el campo correspondiente en `false`.
- [x] 5. Corregir el mensaje del 413
  - `MAX_UPLOAD_BYTES`/`MAX_UPLOAD_MB` en `src/core/upload.ts`, usados por `books.routes` (multer) y `error-handler` (mensaje). El 413 dice 25MB.
  - En `src/config/error-handler.ts`, cambiar `"...(20MB)"` por el valor real. Mejor: derivarlo de la constante del límite, que hoy está inline en `src/modules/books/presentation/books.routes.ts` como `25 * 1024 * 1024`. Extraer la constante a un lugar compartido y usarla en ambos.
- [x] 6. Configurar ESLint en el frontend
  - `frontend/eslint.config.js` (flat config) + script `lint`. 25 problemas iniciales resueltos: `no-empty` (incluido el try vacío de LogoutButton documentado en codigo-muerto), 8 `no-explicit-any` (tipos reales), TDZ real en `BookShelfView` (estado usado antes de declararse), closure stale en `useReadingTimer` (`sessionSeconds` en deps), `prefer-const`, `no-unused-vars`.
  - 3 reglas del compiler de React Hooks v7 desactivadas puntualmente (`set-state-in-effect`, `refs`, `preserve-manual-memoization`): sus patrones (fetch on mount, foco al montar) son legítimos en este código y el refactor sería de comportamiento, no de lint. El resto de reglas quedan activas.
  - Crear `frontend/eslint.config.js` con el flat config usando las dependencias ya instaladas: `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`.
  - Agregar el script `"lint": "eslint ."` a `frontend/package.json`.
  - Agregar el job de lint a la CI.
  - Arrancar con las reglas que el proyecto ya declara en `specs/global-instruction.md`: `no-unused-vars`, `react-hooks/rules-of-hooks`, `react-hooks/exhaustive-deps`, `react-refresh/only-export-components`.
  - El código actual probablemente no pase `react-refresh/only-export-components` ni `no-unused-vars` (hay imports y helpers sin usar). Planificar arreglar los errores, no desactivar la regla.
- [x] 7. Agregar el test de límite de upload
  - En `books.routes.test.ts`: buffer de 26MB por supertest → 413. Multer la rechaza con `LIMIT_FILE_SIZE` y el error-handler responde el tamaño real.
  - Un PDF de más de 25MB debe devolver 413. Requiere un fixture grande o mockear Multer; decidir al implementarlo.

## Criterios de Done

- [x] Un PR que rompa un test falla la CI (workflow en `.github/workflows/ci.yml`, jobs backend/frontend/landing).
- [x] `pnpm build` del frontend corre en la CI.
- [x] `auth.service` (25+11 HTTP), `origins` (5), `env` (6) y `health` (3) tienen tests.
- [x] El mensaje del 413 dice 25MB y viene de `MAX_UPLOAD_MB` en `src/core/upload.ts`.
- [x] `pnpm lint` en el frontend funciona: 0 errores, 1 warning aceptado (fast-refresh de `ThemeContext`; el hook depende del context del mismo módulo).
- [x] Cobertura medida: 87.22% stmts / 78.85% branches / 70.14% funcs / 87.51% lines, anotada en `05-testing.md`.
