# `user_book`

Relación usuario-libro + progreso de lectura. Modelo Prisma `user_book`. **La tabla se llama `user_book` (singular)**: el modelo no declara `@@map`.

Es la tabla central de la app: un usuario "tiene" un libro cuando existe su `user_book`, y todo el progreso de lectura vive aquí.

## Esquema

| Columna | Tipo | Constraints | Descripción |
|---|---|---|---|
| `id` | `TEXT (UUID)` | `PK @default(uuid())` | — |
| `userId` | `TEXT` | `NOT NULL` | FK → `users.id`. |
| `bookId` | `TEXT` | `NOT NULL` | FK → `book.id`. |
| `currentPage` | `INT` | `NOT NULL DEFAULT 0` | Página actual. |
| `scrollPosition` | `INT` | `NOT NULL DEFAULT 0` | Posición de scroll (px). |
| `readingTimeSeconds` | `INT` | `NOT NULL DEFAULT 0` | Tiempo total de lectura (seg). |
| `lastReadAt` | `TIMESTAMPTZ` | NULL | Última lectura. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |

## Índices

- `UNIQUE(userId, bookId)` — un solo user_book por par (upsert).
- `INDEX(userId)`.
- `INDEX(bookId)`.

## Relaciones

| Tabla | Tipo | FK / Referencia |
|---|---|---|
| `book` | N:1 | `user_book.bookId → book.id` (ON DELETE Cascade) |
| `users` | N:1 | `user_book.userId → users.id` (ON DELETE Cascade) |
| `bookmark` | 1:N | `bookmark.userBookId → user_book.id` (ON DELETE Cascade) |

## Reglas de negocio

- **Upsert**: `BookRepository.upsertUserBook` crea si no existe, no modifica si existe (`update: {}`).
- **Ownership**: todos los checks de acceso a libros/marcadores pasan por buscar este user_book (`findUserBook`/`findUserBookAccess`).
- **Delete**: al eliminar un libro se borra el `user_book` (y sus bookmark por cascade). El `book` y el archivo R2 solo se borran si nadie más lo usa.
- `PATCH /book/:id/progress` actualiza `readingTimeSeconds`, `scrollPosition`, `currentPage`, `lastReadAt`.
