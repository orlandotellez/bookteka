# 🟡 Código muerto en el backend

## Estado Actual

Varios símbolos existen, están tipados, compilan y **no los usa nadie**. Cada uno es una trampa: sugiere una capacidad que el sistema no tiene, o duplica un camino que sí existe.

### Imports de dependencias que solo se usan en código muerto

| Símbolo | Archivo | Estado |
|---|---|---|
| `pool` (Pool de `pg`) | `src/config/db.ts` | Exporta un `Pool` que no lo consume nadie. `rg "from 'pg'" src` devuelve **solo** esta línea. El health check de `src/http /health.ts` usa Prisma (`dbPrisma.$queryRaw`), no el pool. |
| `pg` / `@types/pg` | `package.json` | Dos dependencias alive solo por el archivo anterior. |

### Helpers y schemas definidos y nunca llamados

| Símbolo | Archivo | Nota |
|---|---|---|
| `paramsOf` | `src/helper/express.ts` | El gemelo de `bodyOf`, que sí se usa en 3 controllers. |
| `queryOf` | `src/helper/express.ts` | Ninguna ruta valida `query` hoy. |
| `RefreshSchema` | `src/schema/auth.schema.ts` | `POST /auth/refresh` no valida body: lee el token de `req.body.refreshToken` directo en `refreshTokenFromRequest`. |
| `SessionIdSchema` | `src/schema/auth.schema.ts` | No hay ningún endpoint que reciba un `sessionId`. |
| `originsForRequest` | `src/lib/origins.ts` | El CORS usa `isRequestOriginAllowed`, no este. |
| `isProductionEnv` | `src/lib/origins.ts` | `isProduction` es local al módulo. |
| `normalizeText` frontend | — | (ver `specs/tasks/frontend/03-codigo-muerto.md`) |

### Métodos de repositorio que el service no usa

`src/services/book.service.ts` — `deleteBook` abre `dbPrisma.$transaction` y borra con `tx.user_book.delete` y `tx.book.delete` directamente, saltándose el repositorio. Como resultado, tres métodos de `BookRepository` solo aparecen en el repositorio y en los fakes de test:

| Método | Archivo |
|---|---|
| `createAuditLog` | `src/repositories/book.repository.ts` |
| `deleteUserBook` | `src/repositories/book.repository.ts` |
| `deleteBook` | `src/repositories/book.repository.ts` |

Esto rompe la regla que el propio proyecto se impose en `specs/global-instruction.md`: *"No escribir queries de negocio en los controllers ni en los services"*. El service está haciendo queries.

### El quirk del nombre de carpeta

`src/http /routes.ts` y `src/http /health.ts` viven en una carpeta llamada **`http `** con un espacio final. El import de `src/app.ts` lo confirma:
```ts
import { registerRoutes } from "./http /routes.js";
```
Funciona, pero se rompe con cualquier renombrado por shell, con `tsc-alias` si cambia el mapeo, y confunde a cualquier herramienta que normalice paths.

## Objetivo

Que no quede código que aparente una capacidad inexistente, y que ninguna operación de datos escriba en la base de datos desde un service.

## Alcance

- Eliminar los símbolos sin uso.
- Mover el borrado de `book.service.ts` al repositorio.
- Renombrar la carpeta `http `.

## Fuera de alcance

- Agregar tests para código muerto antes de borrarlo: se borra.
- Reestructurar `helper/express.ts` más allá de lo muerto.

## Tareas

- [ ] 1. Borrar `src/config/db.ts` y las dependencias `pg` y `@types/pg`
  - `rg "from 'pg'" src` solo devuelve `src/config/db.ts`. Confirmado que nada más lo usa.
  - Remover el archivo y las dos entradas de `backend-express/package.json`.
  - Actualizar `specs/modules/backend/01-stack.md`, que hoy afirma que el pool se mantiene "solo para el healthcheck".
- [ ] 2. Borrar los helpers y schemas sin uso
  - `paramsOf` y `queryOf` de `src/helper/express.ts`.
  - `RefreshSchema` y `SessionIdSchema` de `src/schema/auth.schema.ts`.
  - `originsForRequest` e `isProductionEnv` de `src/lib/origins.ts`.
  - Si en el futuro aparece un endpoint que valide `query`, el helper se vuelve a agregar con el caso de uso real.
- [ ] 3. Devolver el borrado al repositorio
  - Reescribir `BookService.deleteBook` (`src/services/book.service.ts`) para que use `this.repo.deleteUserBook` y `this.repo.deleteBook` en lugar de `tx.*` directo.
  - El problema: el borrado actual es atómico gracias a `dbPrisma.$transaction` (auditoría + borrado juntos o ninguno). Para mantener la garantía, agregar un método transaccional al repositorio, por ejemplo `deleteBookWithAudit({ userBookId, bookId, deleteBookRow, audit })`, que reciba el cliente de la transacción y ejecute todo dentro.
  - `createAuditLog` entonces sí se usa, y `deleteUserBook` y `deleteBook` también.
- [ ] 4. Renombrar la carpeta `http ` 
  - Mover `src/http /routes.ts` y `src/http /health.ts` a `src/http/routes.ts` y `src/http/health.ts`.
  - Actualizar los dos imports: `src/app.ts` y el `import { healthHandler } from "./health.js"` dentro del propio `routes.ts`.
  - `pnpm build` valida que el rename no rompió el mapeo de `@/*` ni `tsc-alias`.
  - Actualizar las referencias en `specs/modules/backend/02-architecture.md` y `03-api.md`.
- [ ] 5. Barrido final
  - `rg` sobre los exports de `src/` para confirmar que no queda ningún otro huérfano antes de dar por cerrada la tarea.

## Criterios de Done

- [ ] `rg "from 'pg'" backend-express/src` no devuelve nada y `pg` salió de `package.json`.
- [ ] Cada export de `src/` es alcanzable desde `server.ts` o desde un test.
- [ ] `BookService.deleteBook` no escribe en la base de datos: toda query pasa por `BookRepository`.
- [ ] La carpeta `src/http ` ya no existe y `pnpm build` pasa.
- [ ] `pnpm test` pasa.
- [ ] Los specs que mencionaban el pool de `pg`, los schemas muertos y el nombre de la carpeta están actualizados.
