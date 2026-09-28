# 03 · Bookmarks — Marcadores

> ✅ **Implementado en Express** (`backend-express/src/modules/bookmarks/presentation/bookmarks.routes.ts`).

Marcadores por página dentro de un libro. Un marcador pertenece a un `user_book` (relación usuario-libro), lo que garantiza que solo el dueño del libro puede listar/crear/eliminar.

**Auth**: todos los endpoints requieren sesión (`requireAuth`).

## Tabla de endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/books/:bookId/bookmarks` | Lista marcadores de un libro. |
| POST | `/books/:bookId/bookmarks` | Crea un marcador. |
| PATCH | `/books/:bookId/bookmarks/:bookmarkId` | Actualiza `name` y `textPreview`. |
| DELETE | `/books/:bookId/bookmarks/:bookmarkId` | Elimina un marcador. |

> **Estado de la sincronización**: el backend expone los cuatro endpoints y el
> cliente los usa los cuatro. `PATCH` se implementó en `specs/tasks/backend/01-integridad-contrato.md`;
> antes de eso el cliente lo llamaba y el backend devolvía 404, así que un rename
> hecho en un dispositivo nunca llegaba al otro. El `GET` tampoco se usaba: ahora
> `bookStore.loadBookmarks` lo consume vía `syncBookmarksFromCloud`, que hace merge
> con los marcadores locales y da prioridad al cloud.

---

## GET `/api/v1/books/:bookId/bookmarks`

- **Auth**: Sí.

### Response 200

```json
[
  {
    "id": "uuid",
    "userId": "uuid",
    "userBookId": "uuid",
    "name": "Capítulo 3",
    "pageNumber": 42,
    "textPreview": "En un lugar de la Mancha...",
    "createdAt": "ISO-8601"
  }
]
```

### Errores

- `403` — `No autorizado o libro no encontrado` (el usuario no tiene ese user_book).

---

## POST `/api/v1/books/:bookId/bookmarks`

- **Auth**: Sí.

### Request body

```json
{
  "name": "Capítulo 3",
  "pageNumber": 42,
  "textPreview": "En un lugar de la Mancha..."
}
```

### Response 201

```json
{
  "id": "uuid",
  "userId": "uuid",
  "userBookId": "uuid",
  "name": "Capítulo 3",
  "pageNumber": 42,
  "textPreview": "En un lugar de la Mancha...",
  "createdAt": "ISO-8601"
}
```

### Validaciones (CreateBookmarkBodySchema)

- `name`: string, min 1, máx 200.
- `pageNumber`: number, int, positivo.
- `textPreview`: string, máx 2000, opcional.

### Errores

- `400` — payload inválido (Zod).
- `403` — no autorizado / libro no encontrado.

---

## PATCH `/api/v1/books/:bookId/bookmarks/:bookmarkId`

Actualiza los campos editables de un marcador. Implementado en
`backend-express/src/modules/bookmarks/presentation/bookmarks.routes.ts`.

- **Auth**: Sí.

### Request body

```json
{
  "name": "Capítulo 5 (revisado)",
  "textPreview": "Texto corregido del preview"
}
```

### Response 200

```json
{
  "id": "uuid",
  "userId": "uuid",
  "userBookId": "uuid",
  "name": "Capítulo 5 (revisado)",
  "pageNumber": 120,
  "textPreview": "Texto corregido del preview",
  "createdAt": "ISO-8601"
}
```

### Validaciones (`UpdateBookmarkBodySchema`)

| Campo | Regla |
|---|---|
| `name` | string, 1..200. Opcional. |
| `textPreview` | string ≤2000, `null` permitido para limpiarlo. Opcional. |

- Se requiere **al menos un** campo: un body `{}` devuelve 400, no un 200 vacío.
- `pageNumber`, `userId` y `userBookId` **no son editables**. El schema no los declara, así que si el cliente los envía se descartan en silencio (comportamiento `.strip()` de Zod, consistente con el resto de la API).
- No se usa `.strict()`, igual que en los demás schemas de body.

### Errores

- `400` — payload inválido (Zod).
- `403` — el usuario no tiene ese `user_book`.
- `404` — el marcador no pertenece a ese `user_book`.

### Ejemplo

```http
PATCH /api/v1/books/BOOK_ID/bookmarks/BOOKMARK_ID
Authorization: Bearer <access-token>
Content-Type: application/json

{ "name": "Capítulo 5 (revisado)" }
```

---

## DELETE `/api/v1/books/:bookId/bookmarks/:bookmarkId`

- **Auth**: Sí.

### Response 200

```json
{ "success": true }
```

### Errores

- `403` — no autorizado / libro no encontrado.
- `404` — `Bookmark no encontrado`.

---

## Seguridad (patrón)

Todos los handlers primero buscan el `user_book` del usuario (`findUserBookAccess`). Si no existe → 403. `updateBookmark` y `deleteBookmark` agregan un segundo chequeo: `findBookmark(bookmarkId, userBookId)`, para confirmar que el marcador pertenece a ese libro. Así se impide acceder o modificar marcadores de libros ajenos aunque se conozcan los IDs.

---

## Cliente (frontend)

- `bookmarksApi` (`frontend/src/api/bookmark.ts`): `list`, `create`, `update` (PATCH), `remove`. Los cuatro endpoints existen.
- `bookStore.loadBookmarks`: lee de IndexedDB y, si el libro está sincronizado, llama `syncBookmarksFromCloud` (`frontend/src/database/syncBookmarks.ts`) para traer los marcadores del cloud. El merge da prioridad al cloud y conserva los marcadores locales que el servidor todavía no conoce.
- `bookStore.addBookmark`: guarda local y, si el libro está `isSynced`, crea en el backend y reemplaza el ID local por el del servidor.
- `bookStore.updateBookmark`: escribe en IndexedDB y propaga al backend. Si el cloud falla, el cambio queda local.
- `bookStore.removeBookmark`: borra en backend (si isSynced) y local.

> El color de un marcador no se sincroniza: es una decisión de presentación que se
> toma en cada dispositivo. Cuando llega un marcador del cloud sin color local, se
> le asigna uno al azar de la paleta (`pickRandomBookmarkColor`).
