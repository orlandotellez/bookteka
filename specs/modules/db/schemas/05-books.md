# `book`

Libro físico (archivo PDF). Modelo Prisma `book`. **La tabla se llama `book` (singular)**: el modelo no declara `@@map`, así que Prisma usa el nombre del modelo tal cual.

El archivo vive en **Cloudflare R2**; en la DB solo se guardan `fileUrl` y `fileKey`. Los libros se **deduplican por hash SHA-256**: si dos usuarios suben el mismo PDF, comparten la misma fila.

## Esquema

| Columna | Tipo | Constraints | Descripción |
|---|---|---|---|
| `id` | `TEXT (UUID)` | `PK @default(uuid())` | — |
| `title` | `TEXT` | `NOT NULL` | Título (default: nombre del archivo). |
| `author` | `TEXT` | NULL | Autor (opcional). |
| `fileUrl` | `TEXT` | `NOT NULL` | URL pública de R2 (`{R2_PUBLIC_DOMAIN}/{fileKey}`). |
| `fileKey` | `TEXT` | `NOT NULL` | Key del objeto en R2 (`book/{userId}/{timestamp}-{name}`). |
| `fileHash` | `TEXT` | `NOT NULL @unique` | SHA-256 del contenido (deduplicación). |
| `size` | `INT` | NULL | Tamaño del PDF en bytes. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |

## Índices

- `UNIQUE(fileHash)` — deduplicación.
- `INDEX(fileHash)` (implícito por el unique).

## Relaciones

| Tabla | Tipo | FK / Referencia |
|---|---|---|
| `user_book` | 1:N | `user_book.bookId → book.id` (ON DELETE Cascade) |

## Reglas de negocio

- **Upload**: se calcula el hash → si existe, se reusa (no se sube a R2). Si no, se sube a R2 y se inserta.
- **Delete**: se borra el archivo de R2 solo si `countOtherUsers(bookId, userId) === 0`; luego se borra la fila (solo en ese caso).
- Un `book` es compartido entre usuarios; el "ownership" es por `user_book`, no por `book`.
