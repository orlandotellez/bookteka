# 🔴 Integridad del contrato de la API 🟠

## Estado Actual

El backend expone 16 endpoints en `src/routes/*.routes.ts`, pero el contrato entre el backend y el frontend **no coincide en dos puntos concretos**:

1. `frontend/src/api/bookmark.ts` define `bookmarksApi.update()`, que hace `PATCH /books/:bookId/bookmarks/:bookmarkId`. **Ese método no existe en el backend**: `src/routes/bookmark.routes.ts` solo declara `GET`, `POST` y `DELETE` sobre la misma ruta. La request cae en el 404 global de `src/http /routes.ts` (`{ error: "Ruta no encontrada" }`). El store lo absorbe con un `try/catch` y el rename queda solo en IndexedDB (`frontend/src/store/bookStore.ts` — `updateBookmark`), así que el síntoma es silencioso: dos dispositivos muestran nombres distintos para el mismo marcador.
2. Los archivos de request de `backend-express/http/` apuntan a `/api/...` sin el prefijo `/v1` que exige `src/http /routes.ts`, así que todos dan 404. Además `http/books.http` manda `percentageRead` y `totalPages` en el `PATCH /progress`, campos que `UpdateBookProgressBodySchema` descarta en silencio (Zod `.strip()`).

A esto se suma que `src/dto/bookmark/response.ts` está **vacío**: el service devuelve el modelo crudo de Prisma y no hay contrato declarado para la respuesta.

## Objetivo

Que el contrato entre cliente y servidor sea el mismo en los dos sentidos: o el endpoint existe, o el cliente deja de llamarlo.

## Alcance

- Resolver el endpoint de actualización de marcadores (implementarlo o quitarlo del cliente).
- Declarar el DTO de respuesta de marcadores.
- Corregir los tres archivos `.http` para que sean ejecutables.
- Agregar un test HTTP que falle si un endpoint del cliente no existe en el backend.

## Fuera de alcance

- Sincronización de resaltados (no existe el concepto en el backend).
- Reordenar marcadores.
- Paginación de marcadores.

## Tareas

- [ ] 1. Decidir el destino de `PATCH /books/:bookId/bookmarks/:bookmarkId`
  - El cliente ya llama al método desde `bookStore.updateBookmark`. La opción de menor riesgo es implementar el endpoint: el repository ya tiene `findBookmark(bookmarkId, userBookId)` para verificar ownership, y `bookmark.service.ts` ya valida el acceso en cada operación.
  - Si se elige quitarlo del cliente, hay que borrar `bookmarksApi.update` y el `export function updateBookmark` de `frontend/src/api/bookmark.ts`, y el `try/catch` que hoy lo silencia en `bookStore.updateBookmark`.
- [ ] 2. Implementar el endpoint si se opta por la opción 1
  - Agregar en `src/routes/bookmark.routes.ts`: `bookmark.patch("/:bookId/bookmarks/:bookmarkId", validate({ params: BookmarkIdParamSchema, body: UpdateBookmarkBodySchema }), updateBookmark)`.
  - Agregar `UpdateBookmarkBodySchema` en `src/schema/bookmark.schema.ts` con solo los campos editables desde la UI: `name` (1..200) y `textPreview` (≤2000). Sin `.strict()`, igual que el resto.
  - Agregar `updateBookmark` en `src/repositories/bookmark.repository.ts` reutilizando `findBookmark` para no permitir cambiar `userBookId` ni `pageNumber`.
  - Agregar el método en `src/services/bookmark.service.ts` con el mismo patrón `FORBIDDEN` de los otros tres.
  - Agregar el handler en `src/controllers/bookmark.controller.ts`.
  - Agregar tests en `src/__tests__/bookmark.test.ts` (HTTP) y `bookmark.service.test.ts` (service).
- [ ] 3. Llenar `src/dto/bookmark/response.ts`
  - Declarar `BookmarkResponseDTO` con los campos reales que devuelve `BookmarkRepository.getBookmarksByUserBookId`: `id`, `userId`, `userBookId`, `name`, `pageNumber`, `textPreview`, `createdAt`.
  - Tipar el retorno de `getBookmarks` y `createBookmark` con ese DTO para que el contrato quede explícito.
- [ ] 4. Corregir `backend-express/http/books.http`, `bookmarks.http` y `streaks.http`
  - Prefijar todas las rutas con `/api/v1`.
  - En el `PATCH /progress`, reemplazar el body de ejemplo por los campos reales: `currentPage`, `scrollPosition`, `readingTimeSeconds`, `lastReadAt`.
  - Agregar el header `x-session-token` a los ejemplos que hoy no lo tienen.
- [ ] 5. Documentar el contrato de marcadores en `specs/modules/api/03-bookmarks.md`
  - Reemplazar la nota de "el cliente tiene un PATCH pero el backend no" por el contrato real, ya sea endpoint implementado o cliente sin método.

## Criterios de Done

- [ ] `bookmarksApi.update` y el backend coinciden: o existe la ruta, o el método no existe en el cliente. Verificado con una request real.
- [ ] `src/dto/bookmark/response.ts` tiene contenido y el service lo usa como tipo de retorno.
- [ ] Los tres archivos `.http` devuelven respuestas distintas de 404 al ejecutarse contra un backend local.
- [ ] `pnpm test` pasa en `backend-express` con los tests nuevos del endpoint.
- [ ] `specs/modules/api/03-bookmarks.md` refleja el contrato final.
