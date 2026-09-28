# 🟠 Configuración y secretos

## Estado Actual

`src/config/env.ts` valida 12 variables al arrancar y **lanza un error si falta cualquiera** (`getEnvVar`). Eso es correcto y está bien hecho. Los problemas están alrededor.

**Los `.env.example` están desincronizados.** Hay tres y no coinciden:

| Variable | `backend-express/.env.example` | `.env.example` de la raíz | Real en `env.ts` |
|---|---|---|---|
| `R2_ACCESS_KEY_ID` | sí | sí | `env.R2_ACCESS_KEY` |
| `R2_S3_API` | no (va como `R2_ENDPOINT`) | no (va como `R2_ENDPOINT`) | `env.R2_S3_API` ← nombre interno distinto |
| `PORT` | `3000` | `3000` | default `3000` |

Los nombres internos de `env.ts` (`R2_ACCESS_KEY`, `R2_SECRET_KEY`, `R2_S3_API`) **no coinciden** con los nombres de las variables de entorno (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT`). El mapeo está en el objeto literal de `env.ts`, así que funciona, pero leer `env.R2_S3_API` no dice que viene de `R2_ENDPOINT`.

**`FRONTEND_URL` en el `.env.example` del backend apunta a `http://localhost:5173`, pero el dev server de Vite corre en `1420`** (`frontend/vite.config.ts` — `port: 1420, strictPort: true`). Funciona solo porque `src/config/origins.ts` tiene `5173` y `1420` hardcodeados en `DEV_EXTRA_ORIGINS`.

**Los secretos de JWT tienen una validador con escape.** `getJwtSecret` permite valores por defecto **cuando `NODE_ENV === "test"`**:
```ts
if (!value && process.env.NODE_ENV === "test") {
  return `${key.toLowerCase()}-test-secret-with-at-least-32-characters`;
}
```
Es intencional para los tests, pero es una puerta: si `NODE_ENV=test` llega a un entorno desplegado, el backend arranca con un secreto público y conocido.

**No hay `.gitignore` por proyecto.** El `.gitignore` de la raíz contiene una sola línea (`.env`). `backend-express/.gitignore` e `frontend/.gitignore` existen pero no se verificaron contra la raíz. Hoy ningún `.env` está commiteado (solo los tres `.env.example`), así que no hay filtración activa, pero la protección depende de una sola línea en la raíz.

## Objetivo

Que la configuración sea predecible: examples sincronizados, nombres de variable coherentes entre archivo y código, y ninguna puerta trasera al secreto de JWT en producción.

## Alcance

- Alinear los tres `.env.example` con lo que `env.ts` realmente lee.
- Documentar el mapeo entre nombre de env y nombre interno.
- Impedir que el escape de `NODE_ENV=test` aplique fuera de tests.
- Verificar la cobertura de `.gitignore`.

## Fuera de alcance

- Rotación de secretos.
- Vault o gestor de secretos externo.
- Cifrado en reposo de datos sensibles.

## Tareas

- [ ] 1. Alinear los tres `.env.example`
  - `backend-express/.env.example` es el canónico: es el que se copia para desarrollo del backend.
  - La raíz (`.env.example`) solo sirve a `docker-compose.yml`. Revisarlo contra el bloque `environment:` de `docker-compose.yml`: ahí aparecen `DATABASE_URL`, `FRONTEND_URL`, `PORT`, `JWT_*`, `R2_*`, `RESEND_*` y `TRUST_BACKEND_ORIGINS`, que **falta** en el `.env.example` de la raíz.
  - Agregar `TRUST_BACKEND_ORIGINS` a los examples con una nota de que solo se activa detrás de un proxy de confianza (`src/config/origins.ts`).
- [ ] 2. Documentar el mapeo de nombres en `src/config/env.ts`
  - Agregar un comentario junto al objeto `env` que liste cada par: `R2_ACCESS_KEY ← R2_ACCESS_KEY_ID`, `R2_SECRET_KEY ← R2_SECRET_ACCESS_KEY`, `R2_S3_API ← R2_ENDPOINT`.
  - Alternativa mejor: renombrar las claves internas para que coincidan con las de entorno y eliminar el mapeo. Es un rename interno, no afecta ningún `.env` externo. Si se hace, actualizar los 6 puntos de uso: `src/core/storage/s3.client.ts`, `src/modules/books/application/books.service.ts`, `src/modules/books/application/common/books.storage.ts`, `src/http/health.ts` y los specs.
- [ ] 3. Endurecer el escape de `NODE_ENV=test`
  - `getJwtSecret` hoy devuelve un secreto conocido si `NODE_ENV === "test"`. Agregar una guarda de entorno: solo aceptarlo si además el proceso no está escuchando en un puerto de producción, o directamente exigir que los tests inyecten el valor desde el setup de Jest.
  - Más simple y suficiente: que el escape viva en el setup de tests, no en `env.ts`. `src/config/env.ts` debería exigir el secreto siempre.
- [ ] 4. Corregir `FRONTEND_URL` en los examples
  - Poner `http://localhost:1420` en `backend-express/.env.example` para que coincida con el puerto real de Vite, y dejar nota de que `5173` también funciona por estar en `DEV_EXTRA_ORIGINS`.
  - En la raíz, `docker-compose.yml` ya usa `http://localhost:8081`, que es el puerto published del frontend. Verificar que coincida.
- [ ] 5. Consolidar la protección de secretos en la raíz
  - **Verificado: hoy no hay filtración.** `git ls-files` no devuelve ningún `.env` real, ni `frontend/bookteka.keystore`, ni los APKs de 53MB. Los tres `.gitignore` por proyecto funcionan.
  - El punto débil es estructural: la raíz tiene un `.gitignore` de **una sola línea** (`.env`) mientras el resto de la cobertura depende de los `.gitignore` de cada proyecto. Si alguien agrega un proyecto nuevo, no hereda ninguna protección.
  - Mover el patrón común (`.env`, `node_modules`, `dist`, `*.keystore`, `*.apk`) al `.gitignore` de la raíz y dejar en los hijos solo lo específico.
  - Agregar `*.idsig` a `backend-express/.gitignore`: `frontend/.gitignore` ya lo tiene, el del backend no (no afecta hoy, pero es una asimetría innecesaria).
- [ ] 6. Crear `specs/docs/` con la tabla de variables
  - Tabla `Variable` | `Descripción` | `Obligatoria` | `Default` | `Dónde se usa`, derivada de `src/config/env.ts`.

## Criterios de Done

- [ ] Los tres `.env.example` están sincronizados con `src/config/env.ts` y con `docker-compose.yml`.
- [ ] `src/config/env.ts` no tiene ningún camino por el cual el backend arranque con un secreto conocido.
- [ ] `frontend/bookteka.keystore` y los APKs siguen fuera de git después de mover los patrones a la raíz.
- [ ] `git check-ignore` confirma que ningún `.env` real está trackeado.
- [ ] La tabla de variables de entorno existe en `specs/docs/`.
