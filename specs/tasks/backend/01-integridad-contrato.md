# 🔴 Integridad del contrato de la API 🟠

> **Estado: 5 de 5 tareas cerradas, 5 de 5 criterios de Done verificados.**
> Ejecutado el 2026-09-27. Alcance ampliado con aprobación del usuario: además
> del PATCH se conectó el `GET`, porque el sync estaba roto en los dos sentidos.

## Estado Actual

Al momento de escribir esta tarea, el backend exponía 19 endpoints en `src/routes/*.routes.ts` y el contrato entre el backend y el frontend **no coincidía en dos puntos concretos**:

1. `frontend/src/api/bookmark.ts` definía `bookmarksApi.update()`, que hacía `PATCH /books/:bookId/bookmarks/:bookmarkId`. **Ese método no existía en el backend**: `src/routes/bookmark.routes.ts` solo declaraba `GET`, `POST` y `DELETE` sobre la misma ruta. La request caía en el 404 global de `src/http /routes.ts` (`{ error: "Ruta no encontrada" }`). El store lo absorbía con un `try/catch` cuyo comentario literally decía *"Si falla la sync (p. ej. backend sin PATCH), el cambio sigue localmente"*.
2. Los archivos de request de `backend-express/http/` apuntaban a `/api/...` sin el prefijo `/v1` que exige `src/http /routes.ts`, así que todos daban 404. Además `http/books.http` mandaba `percentageRead` y `totalPages` en el `PATCH /progress`, campos que `UpdateBookProgressBodySchema` descarta en silencio (Zod `.strip()`).

A esto se sumaba que `src/dto/bookmark/response.ts` estaba **vacío**: el service devolvía el modelo crudo de Prisma y no había contrato declarado para la respuesta.

### Hallazgo durante la ejecución

Al correr los tests apareció un **bloqueador no previsto en la tarea**: las tres suites HTTP (`book.test.ts`, `bookmark.test.ts`, `streak.test.ts`) **no compilaban**. Haban estado muertas sin que nadie lo notara.

Causa: los tests hacían `const mod = await import("@/server"); const app = mod.default`, pero **`src/server.ts` no tiene default export** — es el bootstrap que abre el puerto e instala signal handlers. El default export está en `src/app.ts`. TypeScript rechazaba las tres suites con `TS2339`.

Efecto: 3 de 7 suites sin ejecutar, 38 tests corriendo. Al cambiar los imports a `@/app` aparecieron **46 tests que hacía tiempo no se ejecutaban**.

### Segundo hallazgo: el sync estaba roto en los dos sentidos

La tarea solo documentaba el `PATCH`. Al leer la UI se vio que **`GET /books/:bookId/bookmarks` tampoco se usaba nunca**: `bookStore.loadBookmarks` leía únicamente de IndexedDB y `bookmarksApi.list` estaba definido pero jamás invocado. El backend guardaba los marcadores correctamente y **nadie los leía**: un marcador creado en el escritorio jamás llegaba al teléfono.

El usuario aprobó ampliar el alcance para conectar también el `GET`, porque el sync estaba roto en los dos sentidos.

## Objetivo

Que el contrato entre cliente y servidor sea el mismo en los dos sentidos: cada endpoint que el cliente llama existe, y cada endpoint que existe se usa.

## Alcance

- Resolver el endpoint de actualización de marcadores.
- Conectar el `GET` de marcadores para que el cloud llegue al cliente.
- Declarar el DTO de respuesta de marcadores.
- Corregir los tres archivos `.http` para que sean ejecutables.
- Tests HTTP y de service del endpoint nuevo, y tests del merge del cliente.

## Fuera de alcance

- Sincronización de resaltados (no existe el concepto en el backend).
- Reordenar marcadores.
- Paginación de marcadores.
- Borrado de marcadores desde otro dispositivo: sin marca de "sincronizado" en el tipo local, no hay forma de distinguir "creado offline" de "borrado en el cloud". Ver `Notas de diseño`.

## Tareas

- [x] 1. Decidir el destino de `PATCH /books/:bookId/bookmarks/:bookmarkId`
  - **Decisión: implementarlo en el backend.** La evidencia forzaba la opción:
  - La UI **ya tenía la edición implementada y funcionando**: `frontend/src/components/pages/reader/BooksmarksPanel.tsx` tiene formulario de edición, campos de nombre y preview, guardar/cancelar, teclas Enter y Escape, y estado `isSaving`. `Reader.tsx:246` la conecta con el store.
  - Quitar el método del cliente habría borrado una feature terminada, no código muerto.
  - El repository ya tenía `findBookmark(bookmarkId, userBookId)` para verificar ownership, y el service ya validaba el acceso en las otras tres operaciones. El camino estaba medio puesto.
- [x] 2. Implementar el endpoint
  - `UpdateBookmarkBodySchema` en `src/schema/bookmark.schema.ts`: solo `name` (1..200) y `textPreview` (≤2000, `null` permitido), con un `.refine` que exige al menos un campo. Sin `.strict()`.
  - `updateBookmark` en `IBookmarkRepository` y `BookmarkRepository`, con `where: { id }` — el ownership ya está validado por el service.
  - `UpdateBookmarkInput` en `src/types/bookmark.d.ts`.
  - `BookmarkService.updateBookmark` con doble verificación: `findUserBookAccess` (403) y luego `findBookmark` (404).
  - `updateBookmark` en `src/controllers/bookmark.controller.ts` → `res.json(bookmark)`.
  - Ruta `PATCH /:bookId/bookmarks/:bookmarkId` en `src/routes/bookmark.routes.ts`.
  - Tests: 5 en `bookmark.test.ts` (401, 403, 404, 400 por nombre largo, y uno que manda `pageNumber`/`userBookId` a propósito para probar que el schema los descarta) y 6 en `bookmark.service.test.ts`.
- [x] 3. Llenar `src/dto/bookmark/response.ts`
  - `BookmarkResponseDTO` con los campos reales de la tabla `bookmark`.
  - `getBookmarks` y `createBookmark` ahora devuelven `Promise<BookmarkResponseDTO>`; `updateBookmark` también.
  - `name` está tipado `string | null` porque así es la columna. La nota del DTO explica que `CreateBookmarkBodySchema` exige `min(1)`, así que solo las filas anteriores a ese schema podrían tener `null`.
- [x] 4. Conectar el `GET` de marcadores en el cliente
  - Nuevo `frontend/src/database/syncBookmarks.ts` con `syncBookmarksFromCloud` y el merge puro `mergeBookmarks`.
  - Reglas: el cloud pisa cuando el id existe en ambos lados; los locales que el cloud no conoce se conservan; se normaliza `createdAt` (ISO → number) y `textPreview` (`null` → `""`); se asigna color a los que vienen del cloud; el resultado se ordena por `createdAt` descendente, igual que el backend.
  - `bookStore.loadBookmarks` ahora consulta el cloud **solo si el libro está `isSynced`**, y si la llamada falla devuelve los locales.
  - Exportado desde `database/index.ts`.
  - 9 tests en `src/__tests__/database/syncBookmarks.test.ts` y 3 en `bookStore.test.ts`.
- [x] 5. Corregir `backend-express/http/*.http` y documentar el contrato
  - Los tres archivos usan variables `@host`, `@bookId`, `@bookmarkId`, `@token`, llevan el prefijo `/api/v1` y el header `Authorization`.
  - El body de ejemplo del `PATCH /progress` ahora usa los campos reales (`currentPage`, `scrollPosition`, `readingTimeSeconds`, `lastReadAt`).
  - `specs/modules/api/03-bookmarks.md`: tabla de endpoints con el PATCH, sección completa del endpoint nuevo con validaciones y errores, y sección de cliente actualizada.

## Criterios de Done

- [x] `bookmarksApi.update` y el backend coinciden, verificado con una request real (los 5 tests HTTP del PATCH).
- [x] El `GET` también: `bookmarksApi.list` pasó de estar definido y nunca invocado a ser consumido por `bookStore.loadBookmarks`.
- [x] `src/dto/bookmark/response.ts` tiene contenido y el service lo usa como tipo de retorno.
- [x] Los tres archivos `.http` apuntan a `/api/v1` con el body real. Verificado por inspección: no se ejecutaron contra un backend local porque no había base de datos disponible en el entorno.
- [x] `pnpm test` en `backend-express`: **94/94 en 7 suites**. `pnpm build` pasa.
- [x] `pnpm exec vitest run` en `frontend`: **70/70 en 9 archivos**. `pnpm build` pasa.
- [x] `specs/modules/api/03-bookmarks.md` refleja el contrato final.

## Notas de diseño

- **Por qué el cloud gana en el merge de marcadores**: es lo que arregla el bug original. Un rename hecho en el escritorio tiene que llegar al teléfono. En los libros el merge usa `Math.max` porque el progreso nunca debe retroceder; acá aplica el mismo criterio con un campo que es texto.
- **Por qué los marcadores locales se conservan**: sin una marca de "sincronizado" en el tipo `Bookmark` no hay forma de distinguir "creado offline, todavía no subido" de "borrado en otro dispositivo". Descartar el local perdería marcadores; duplicar es el error más barato. Si más adelante se agrega la marca, se puede cerrar.
- **El color no se sincroniza**: es una decisión de presentación. `pickRandomBookmarkColor` asigna uno cuando el marcador llega del cloud sin color local.
- **`bookId` se reconstruye en el merge**: el backend manda `userBookId`, y el store y la UI indexan por `bookId`.

## Deuda que quedó abierta (anotada en otras tareas)

- **Tests no herméticos**: las suites HTTP dependen de un `.env` local. Sin él, `pnpm test` muere con `Missing environment variable: DATABASE_URL`. Verificado empíricamente. Esto bloquea la CI → `specs/tasks/backend/05-ci-y-calidad.md`.
- **El `PATCH` de marcadores no tiene test de integración contra PostgreSQL**: se prueba el contrato con Prisma mockeado.
