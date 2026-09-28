# 02 · Books — Libros

> ✅ **Implementado en Express** (`backend-express/src/modules/books/presentation/books.routes.ts`).

Gestión de libros PDF: lista, upload con deduplicación por hash SHA-256, descarga con URL firmada, stream, progreso de lectura y borrado con auditoría.

**Auth**: todos los endpoints requieren sesión (`requireAuth`).

**Storage**: Cloudflare R2 (S3-compatible). El backend sube el PDF solo si el hash no existe; si dos usuarios suben el mismo archivo, comparten el mismo `book`.

## Tabla de endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/books` | Lista libros del usuario (con progreso). |
| POST | `/books/upload` | Sube PDF (multipart, máx 25MB) + metadatos. |
| GET | `/books/:id/download` | URL firmada de R2 (15 min). |
| GET | `/books/:id/stream` | Stream del PDF (proxy anti-CORS). |
| PATCH | `/books/:id/progress` | Actualiza progreso de lectura. |
| DELETE | `/books/:id` | Elimina (de R2 solo si nadie más lo usa) + auditoría. |

---

## GET `/api/v1/books`

- **Auth**: Sí.

### Response 200

```json
[
  {
    "id": "uuid",
    "name": "El Quijote.pdf",
    "author": "Cervantes",
    "createdAt": 1710000000000,
    "lastReadAt": 1710000000000,
    "readingTimeSeconds": 120,
    "scrollPosition": 4500,
    "currentPage": 42,
    "fileUrl": "https://pub-xxx.r2.dev/books/uuid/...",
    "fileKey": "books/uuid/1710000000-el-quijote.pdf",
    "isSynced": true
  }
]
```

### Notas

- Ordenados por `lastReadAt` desc.
- `createdAt`/`lastReadAt` son **timestamps numéricos (ms)**.
- `isSynced: true` siempre (vienen del cloud).

---

## POST `/api/v1/books/upload`

- **Auth**: Sí.
- **Content-Type**: `multipart/form-data`.

### Request (form-data)

| Campo | Tipo | Descripción |
|---|---|---|
| `file` o `pdf` | file | PDF (alias de campo, máx 25MB). |
| `title` | string | Título (default: nombre original). |
| `author` | string | Autor (opcional). |
| `readingTimeSeconds` | string | Tiempo previo (opcional). |
| `scrollPosition` | string | Posición previa (opcional). |
| `currentPage` | string | Página previa (opcional). |

### Response 200

```json
{ "bookId": "uuid", "userBookId": "uuid" }
```

### Errores

- `401` — sin sesión.
- `400` — sin archivo / multer error.
- `413` — archivo > 25MB (`LIMIT_FILE_SIZE`).

### Flujo (BookService.uploadBook)

```
1. Recibe PDF + metadatos.
2. SHA-256 del buffer → fileHash.
3. ¿Existe book con ese hash?
   ├── Sí → reusa el book (no sube a R2).
   └── No →
       4. Normaliza nombre (helper/format.ts).
       5. PUT a R2 (key: books/{userId}/{timestamp}-{nombre}).
       6. INSERT book (title, author, fileKey, fileUrl, fileHash, size).
7. UPSERT user_book (userId, bookId, readingTimeSeconds, scrollPosition).
8. Devuelve { bookId, userBookId }.
```

---

## GET `/api/v1/books/:id/download`

- **Auth**: Sí.

### Response 200

```json
{ "url": "https://pub-xxx.r2.dev/books/...?...X-Amz-Signature=..." }
```

- URL firmada válida por **15 minutos** (`getSignedUrl` con `expiresIn: 60*15`).

### Errores

- `403` — `No es tu libro` (el user_book no existe para este usuario).

---

## GET `/api/v1/books/:id/stream`

- **Auth**: Sí.

### Response 200 (application/pdf)

- `Content-Type: application/pdf`
- `Content-Disposition: inline; filename="<title>.pdf"`
- `Content-Length`

El backend proxya el `GetObjectCommand` de R2 (evita CORS y protege el bucket).

### Errores

- `403` — no es tu libro.
- `500` — error al obtener el archivo.

---

## PATCH `/api/v1/books/:id/progress`

- **Auth**: Sí.
- **Rate limit**: 600 / 15 min (`progressLimiter`).

### Request body (todos opcionales)

```json
{
  "readingTimeSeconds": 540,
  "scrollPosition": 12000,
  "currentPage": 88,
  "lastReadAt": 1710000000000
}
```

### Response 200

```json
{
  "success": true,
  "readingTimeSeconds": 540,
  "scrollPosition": 12000,
  "currentPage": 88,
  "lastReadAt": "ISO-8601 | null"
}
```

### Errores

- `400` — payload inválido (Zod).
- `404` — user_book no existe para el usuario.

---

## DELETE `/api/v1/books/:id`

- **Auth**: Sí.

### Response 200

```json
{
  "success": true,
  "message": "Libro eliminado correctamente",
  "auditId": "uuid"
}
```

### Errores

- `404` — `Libro no encontrado para este usuario`.

### Flujo (BookService.deleteBook)

```
1. findUserBook(userId, bookId) → si no existe, 404.
2. countOtherUsers(bookId, userId) → ¿alguien más usa este book?
   ├── 0 → DELETE de R2 (DeleteObjectCommand) + DELETE book.
   └── >0 → solo se elimina el user_book (el book queda).
3. INSERT audit_log (action, entityType="book", entityId, userId, metadata).
4. DELETE user_book.
```

---

## Cliente (frontend)

- `booksApi` (`src/api/book.ts`): `list`, `upload` (FormData), `download`, `stream` (`api.raw` → Response), `updateProgress`, `remove`.
- `processBookForReading` (`frontend/src/lib/pdf.ts`): stream → arrayBuffer → pdf.js extrae texto con marcadores `[PAGE_n]`.
- El store coalesce los PATCH /progress (3s) y los flushea con keepalive al cerrar.
