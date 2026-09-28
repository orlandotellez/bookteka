# `bookmark`

Marcadores por página. Modelo Prisma `bookmark`. **La tabla se llama `bookmark` (singular)**: el modelo no declara `@@map`.

Pertenece a un `user_book` (no directo a `book`), lo que garantiza el ownership por usuario.

## Esquema

| Columna | Tipo | Constraints | Descripción |
|---|---|---|---|
| `id` | `TEXT (UUID)` | `PK @default(uuid())` | — |
| `userId` | `TEXT` | `NOT NULL` | FK → `users.id` (denormalizado para queries rápidas). |
| `userBookId` | `TEXT` | `NOT NULL` | FK → `user_book.id`. |
| `name` | `TEXT` | NULL | Nombre del marcador. |
| `pageNumber` | `INT` | `NOT NULL` | Página del libro. |
| `textPreview` | `TEXT` | NULL | Preview del texto marcado. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |

## Índices

- `INDEX(userId)`.
- `INDEX(userBookId)`.

## Relaciones

| Tabla | Tipo | FK / Referencia |
|---|---|---|
| `user_book` | N:1 | `bookmark.userBookId → user_book.id` (ON DELETE Cascade) |

## Reglas de negocio

- **Acceso**: `BookmarkRepository.findUserBookAccess(userId, bookId)` valida que el usuario tenga el `user_book` antes de cualquier operación → 403 si no.
- Listado ordenado por `createdAt` desc.
- El color del marcador es un campo **solo-cliente** (IndexedDB) — no viaja al backend.
- El cliente migra marcadores legacy (`scrollPosition` → `pageNumber`) localmente.
- ⚠️ El backend NO implementa PATCH de marcadores (el cliente lo usa pero falla silenciosamente y queda local).
