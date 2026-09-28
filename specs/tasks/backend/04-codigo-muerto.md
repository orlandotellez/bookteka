# 🟡 Código muerto en el backend

## Estado Actual

Varios símbolos existen, están tipados, compilan y **no los usa nadie**. Cada uno es una trampa: sugiere una capacidad que el sistema no tiene, o duplica un camino que sí existe.

### Imports de dependencias que solo se usan en código muerto

| Símbolo | Archivo | Estado |
|---|---|---|
| `pool` (Pool de `pg`) | `src/config/prisma.ts` | **✅ Resuelto en el refactor a módulos.** El archivo se eliminó. |
| `pg` / `@types/pg` | `package.json` | **✅ Resuelto.** Eliminadas las dependencias junto con el archivo. |

### Helpers y schemas definidos y nunca llamados

| Símbolo | Archivo | Nota |
|---|---|---|
| `paramsOf` | `src/core/http/express.utils.ts` | El gemelo de `bodyOf`, que sí se usa en 3 controllers. |
| `queryOf` | `src/core/http/express.utils.ts` | Ninguna ruta valida `query` hoy. |
| `RefreshSchema` | `src/modules/auth/presentation/auth.dto.ts` | `POST /auth/refresh` no valida body: lee el token de `req.body.refreshToken` directo en `refreshTokenFromRequest`. |
| `SessionIdSchema` | `src/modules/auth/presentation/auth.dto.ts` | No hay ningún endpoint que reciba un `sessionId`. |
| `originsForRequest` | `src/config/origins.ts` | El CORS usa `isRequestOriginAllowed`, no este. |
| `isProductionEnv` | `src/config/origins.ts` | `isProduction` es local al módulo. |
| `normalizeText` frontend | — | (ver `specs/tasks/frontend/03-codigo-muerto.md`) |

### Métodos de repositorio que el service no usa

`src/modules/books/application/books.service.ts` — `deleteBook` abre `dbPrisma.$transaction` y borra con `tx.user_book.delete` y `tx.book.delete` directamente, saltándose el repositorio. Como resultado, tres métodos de `BookRepository` solo aparecen en el repositorio y en los fakes de test:

| Método | Archivo |
|---|---|
| `createAuditLog` | `src/modules/books/infrastructure/books.prisma.repository.ts` |
| `deleteUserBook` | `src/modules/books/infrastructure/books.prisma.repository.ts` |
| `deleteBook` | `src/modules/books/infrastructure/books.prisma.repository.ts` |

Esto rompe la regla que el propio proyecto se impose en `specs/global-instruction.md`: *"No escribir queries de negocio en los controllers ni en los services"*. El service está haciendo queries.

### El quirk del nombre de carpeta

`src/http/routes.ts` y `src/http/health.ts` viven en una carpeta llamada **`http `** con un espacio final. El import de `src/app.ts` lo confirma:
```ts
import { registerRoutes } from "./http/routes.js";
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

- [x] 1. Borrar `src/config/prisma.ts` y las dependencias `pg` y `@types/pg`
  - Hecho en el refactor a módulos verticales. El archivo y las dependencias ya no existen.
- [ ] 2. Borrar los helpers y schemas sin uso
  - `paramsOf` y `queryOf` de `src/core/http/express.utils.ts`.
  - `RefreshSchema` y `SessionIdSchema` de `src/modules/auth/presentation/auth.dto.ts`.
  - `originsForRequest` e `isProductionEnv` de `src/config/origins.ts`.
  - Si en el futuro aparece un endpoint que valide `query`, el helper se vuelve a agregar con el caso de uso real.
- [ ] 3. Devolver el borrado al repositorio
  - Reescribir `BooksService.deleteBook` (`src/modules/books/application/books.service.ts`) para que use `this.repo.deleteUserBook` y `this.repo.deleteBook` en lugar de `tx.*` directo.
  - El problema: el borrado actual es atómico gracias a `dbPrisma.$transaction` (auditoría + borrado juntos o ninguno). Para mantener la garantía, agregar un método transaccional al repositorio, por ejemplo `deleteBookWithAudit({ userBookId, bookId, deleteBookRow, audit })`, que reciba el cliente de la transacción y ejecute todo dentro.
  - `createAuditLog` entonces sí se usa, y `deleteUserBook` y `deleteBook` también.
- [ ] 4. Renombrar la carpeta `http ` 
  - Mover `src/http/routes.ts` y `src/http/health.ts` a `src/http/routes.ts` y `src/http/health.ts`.
  - Actualizar los dos imports: `src/app.ts` y el `import { healthHandler } from "./health.js"` dentro del propio `routes.ts`.
  - `pnpm build` valida que el rename no rompió el mapeo de `@/*` ni `tsc-alias`.
  - Actualizar las referencias en `specs/modules/backend/02-architecture.md` y `03-api.md`.
- [ ] 5. Barrido final
  - `rg` sobre los exports de `src/` para confirmar que no queda ningún otro huérfano antes de dar por cerrada la tarea.

## Criterios de Done

- [x] `rg "from 'pg'" backend-express/src` no devuelve nada y `pg` salió de `package.json`.
- [x] Cada export de `src/` es alcanzable desde `server.ts` o desde un test. Barrido con regex: **0 huérfanos** tras la limpieza. Se eliminaron 3 archivos completos sin consumidores (`books.entities.ts`, `error-messages.ts`, `audit.types.ts`) y 22 exports muertos.
- [x] `BooksService.deleteBook` no escribe en la base de datos: toda query pasa por el repositorio. `IBooksRepository.transaction` ejecuta `createAuditLog`/`deleteUserBook`/`deleteBook` dentro de una transacción de Prisma (mismo patrón que auth).
- [x] La carpeta `src/http ` ya no existe y `pnpm build` pasa.
- [x] `pnpm test` pasa: 150/150. El flake del 401 que apareció al cerrar esta tarea resultó ser un timeout de 5s de Jest bajo instrumentación — se subió `testTimeout` a 10s en la tarea 05-ci. No era un bug del código.
- [x] Los specs que mencionaban el pool de `pg`, los schemas muertos y el nombre de la carpeta están actualizados.
