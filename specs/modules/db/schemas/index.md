# Modelo de datos — Bookteka

Los 9 modelos de `prisma/schema.prisma` en un archivo, con sus relaciones y las convenciones que los gobiernan.

> **Fuente de verdad**: `backend-express/prisma/schema.prisma` y los `CREATE TABLE` de `backend-express/prisma/migrations/`.

---

## Modelo completo

### 1. `users` — personas

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `name` | TEXT | No | — | |
| `email` | TEXT | No | — | **Único**. Se guarda en minúsculas. |
| `email_verified` | BOOLEAN | No | `false` | |
| `phone` | TEXT | Sí | — | Nunca escrita. |
| `image` | TEXT | Sí | — | Nunca escrita. |
| `role` | `ROLE` | No | `'user'` | `user` \| `admin`. `admin` sin uso. |
| `created_at` | TIMESTAMPTZ | No | `now()` | |
| `updated_at` | TIMESTAMPTZ | No | `@updatedAt` | |
| `deleted_at` | TIMESTAMPTZ | Sí | — | Soft delete. **Nunca escrito**: no hay operación que lo llene. |

Índices: `email`, `role`, `deleted_at`.

### 2. `session` — sesiones abiertas

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | TEXT | No | PK, `uuid()` |
| `expires_at` | TIMESTAMPTZ | No | |
| `token` | TEXT | No | **Único**. Es el refresh token JWT. |
| `ip_address` | TEXT | Sí | Del header `x-forwarded-for`. |
| `user_agent` | TEXT | Sí | |
| `user_id` | TEXT | No | FK → `users.id`, **Cascade** |
| `created_at` | TIMESTAMPTZ | No | `now()` |
| `updated_at` | TIMESTAMPTZ | No | `@updatedAt` |

Índices: `user_id`. Sin purga automática: ver `specs/tasks/db/01-integridad-esquema.md`.

### 3. `account` — credenciales

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | TEXT | No | PK, `uuid()` |
| `account_id` | TEXT | No | |
| `provider_id` | TEXT | No | Único junto con `account_id`. Valor usado: `credentials`. |
| `user_id` | TEXT | No | FK → `users.id`, **Cascade** |
| `access_token` | TEXT | Sí | **Sin uso** (OAuth futuro). |
| `refresh_token` | TEXT | Sí | **Sin uso**. |
| `id_token` | TEXT | Sí | **Sin uso**. |
| `scope` | TEXT | Sí | **Sin uso**. |
| `password` | TEXT | Sí | Hash bcrypt, costo 10. |
| `access_token_expires_at` | TIMESTAMPTZ | Sí | **Sin uso**. |
| `refresh_token_expires_at` | TIMESTAMPTZ | Sí | **Sin uso**. |
| `created_at` | TIMESTAMPTZ | No | `now()` |
| `updated_at` | TIMESTAMPTZ | No | Sin default (migración `20260802234345_init`) |

Índices: `user_id`. Único: `(provider_id, account_id)`.

### 4. `verification` — códigos de confirmación

| Campo | Tipo | Nulo | Notas |
|---|---|---|---|
| `id` | TEXT | No | PK, `uuid()` |
| `identifier` | TEXT | No | El email. |
| `value` | TEXT | No | Código de 6 caracteres (`A-Z0-9`). |
| `expires_at` | TIMESTAMPTZ | No | 15 minutos. |
| `created_at` | TIMESTAMPTZ | No | `now()` |
| `updated_at` | TIMESTAMPTZ | No | Sin default. |

Índices: `identifier`. `createVerification` borra los previos del mismo `identifier` antes de insertar.

### 5. `book` — ficha del archivo

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `title` | TEXT | No | — | Default: nombre del archivo. |
| `author` | TEXT | Sí | — | Default: `"??"` si no se manda. |
| `fileUrl` | TEXT | No | — | `` `${R2_PUBLIC_DOMAIN}/${fileKey}` `` |
| `fileKey` | TEXT | No | — | `books/{userId}/{timestamp}-{nombre}` |
| `fileHash` | TEXT | No | — | **Único**. SHA-256 del contenido. |
| `size` | INT | Sí | — | Bytes. |
| `createdAt` | TIMESTAMPTZ | No | `now()` | |

Índices: `fileHash` (además del `@unique`).

> **El archivo no está en la base.** Solo la dirección. `fileUrl` y `fileKey`.

### 6. `user_book` — progreso de lectura

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `userId` | TEXT | No | — | FK → `users.id`, **Cascade** |
| `bookId` | TEXT | No | — | FK → `book.id`, **Cascade** |
| `currentPage` | INT | No | `0` | |
| `scrollPosition` | INT | No | `0` | Píxeles. |
| `readingTimeSeconds` | INT | No | `0` | |
| `lastReadAt` | TIMESTAMPTZ | Sí | — | |
| `createdAt` | TIMESTAMPTZ | No | `now()` | |

Índices: `userId`, `bookId`. **Único: `(userId, bookId)`**.

> **La tabla central del sistema.** Es la llave de todo el control de acceso.

### 7. `bookmark` — marcas de página

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `userId` | TEXT | No | — | Sin FK declarada; desnormalizado para consultas. |
| `userBookId` | TEXT | No | — | FK → `user_book.id`, **Cascade** |
| `name` | TEXT | Sí | — | |
| `pageNumber` | INT | No | — | |
| `textPreview` | TEXT | Sí | — | |
| `createdAt` | TIMESTAMPTZ | No | `now()` | |

Índices: `userId`, `userBookId`.

> Cuelga de `user_book`, no de `book`: así el acceso depende de la persona.

### 8. `user_streak` — racha diaria

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `userId` | TEXT | No | — | **Único**. Una racha por persona. Sin FK declarada. |
| `currentStreak` | INT | No | `0` | |
| `startDate` | TIMESTAMPTZ | Sí | — | |
| `lastActiveDate` | TIMESTAMPTZ | Sí | — | Se usa como predicado de concurrencia. |
| `createdAt` | TIMESTAMPTZ | No | `now()` | |
| `updatedAt` | TIMESTAMPTZ | No | — | Sin default. |

Índices: `userId` (redundante con el `@unique`).

### 9. `audit_log` — auditoría

| Campo | Tipo | Nulo | Default | Notas |
|---|---|---|---|---|
| `id` | TEXT | No | `uuid()` | PK |
| `action` | TEXT | No | — | Único valor escrito: `DELETE`. |
| `entityType` | TEXT | No | — | Único valor escrito: `BOOK`. |
| `entityId` | TEXT | No | — | |
| `userId` | TEXT | No | — | Sin FK declarada. |
| `metadata` | JSONB | Sí | — | Título, autor, key, tamaño, fecha. |
| `createdAt` | TIMESTAMPTZ | No | `now()` | |

Índices: `(entityType, entityId)`, `userId`, `createdAt`.

> **Nunca se lee.** No hay endpoint ni query que la consulte.

---

## Resumen de relaciones

```
users ─┬─< session          (Cascade, por user_id)
       ├─< account          (Cascade, por user_id)
       ├─< user_book        (Cascade, por userId)
       ├── user_streak      (1:1, userId único, sin FK)
       └─< audit_log        (sin FK declarada, por userId)

book ──< user_book          (Cascade, por bookId)
       └─< bookmark         (vía user_book, Cascade)

user_book ──< bookmark       (Cascade, por userBookId)
```

### Quién tiene qué

| Persona | Tiene |
|---|---|
| Un usuario | muchas `session` (sus sesiones abiertas) |
| Un usuario | muchas `account` (hoy exactamente una, `credentials`) |
| Un usuario | muchos `user_book` (su biblioteca) |
| Un usuario | exactamente un `user_streak` |
| Un usuario | muchos `audit_log` (lo que hizo) |
| Un `book` | muchos `user_book` (quién más lo tiene) |
| Un `user_book` | muchos `bookmark` (sus marcas) |

### El `book` compartido sin función de compartir

Un mismo `book` puede estar en la biblioteca de varias personas. Eso **no** es una función de compartir: es el efecto de la deduplicación por `fileHash`. Si dos personas suben el mismo PDF, la segunda reutiliza la fila existente. El progreso y las marcas siguen siendo siempre de una sola persona, porque cuelgan de `user_book`.

---

## Convenciones

### Nombres de tabla

**Solo 4 de los 9 modelos declaran `@@map`.** Esto no es un error, pero es la trampa más fácil del esquema:

| Modelo | Tabla real | Por qué |
|---|---|---|
| `user` | `users` | `@@map("users")` |
| `session` | `session` | `@@map("session")` |
| `account` | `account` | `@@map("account")` |
| `verification` | `verification` | `@@map("verification")` |
| `book` | **`book`** | Sin `@@map` |
| `user_book` | **`user_book`** | Sin `@@map` |
| `bookmark` | **`bookmark`** | Sin `@@map` |
| `user_streak` | **`user_streak`** | Sin `@@map` |
| `audit_log` | **`audit_log`** | Sin `@@map` |

`SELECT * FROM books` falla. La tabla se llama `book`. Cuando uses Prisma no importa (usa los nombres de modelo), pero en SQL crudo o en `psql` sí.

### Nombres de columna

**Inconsistentes a propósito, por historia:**

- snake_case en las 4 tablas de auth (`user_id`, `email_verified`, `created_at`, `ip_address`).
- **camelCase en las 5 de contenido** (`userId`, `bookId`, `currentPage`, `fileHash`, `lastReadAt`, `pageNumber`).

No es un error a corregir sobre la marcha: unificar exige renombrar columnas en 5 tablas y todas las queries. Lo correcto es **seguir la convención de cada grupo** al agregar columnas nuevas.

### Timestamps

- `created_at` / `createdAt`: `DEFAULT now()`.
- `updated_at` / `updatedAt`: `@updatedAt` en `user`, `session`, `bookmark`; **sin default** en `account` y `verification` (migración `20260802234345_init`); `@updatedAt` en `user_streak`.
- `account.updated_at` y `verification.updated_at` quedaron sin default. No es un bug: Prisma los maneja igual.
- Todos los timestamps de auth son `TIMESTAMPTZ`. Los de contenido son `TIMESTAMP(3)` (sin zona), que es lo que Prisma usa por defecto en PostgreSQL.

### Primary keys

Todos `TEXT` con `@default(uuid())`. **Ninguna validación exige UUID**: los schemas de Zod solo comprueban que el id no esté vacío (`z.string().min(1, "id requerido")`).

### Integridad referencial

| Relación | FK declarada | `onDelete` |
|---|---|---|
| `session` → `users` | Sí | Cascade |
| `account` → `users` | Sí | Cascade |
| `user_book` → `users` | Sí | Cascade |
| `user_book` → `book` | Sí | Cascade |
| `bookmark` → `user_book` | Sí | Cascade |
| `bookmark.userId` → `users` | **No** | — |
| `user_streak.userId` → `users` | **No** | — |
| `audit_log.userId` → `users` | **No** | — |

Las tres sin FK son deliberadas en cuanto a no bloquear borrados, pero dejan filas huérfanas si se borra un usuario. Hoy no hay borrado de usuarios, así que no se manifiesta.

### Soft delete

Solo `users.deleted_at`. `login` y `getSession` ya filtran por `deleted_at: null`, pero **no existe ninguna operación que lo escriba**. Ver `specs/tasks/db/01-integridad-esquema.md`.

### Deduplicación

`book.fileHash` con `@unique`. El hash es el SHA-256 del contenido del archivo (`generateFileHash` en `src/modules/books/application/common/books.utils.ts`). Si el hash ya existe, el upload no sube el archivo de nuevo.

### Borrado

`user_book` y sus `bookmark` se borran en cascada. El objeto de R2 y la fila `book` solo se borran si `countOtherUsers(bookId) === 0`. Cada borrado escribe un `audit_log` en la misma transacción.
