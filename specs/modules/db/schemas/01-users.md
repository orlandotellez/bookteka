# `users`

Usuarios de Bookteka. Modelo Prisma `user`, mapeado a tabla `users` (`@@map("users")`).

## Esquema

| Columna | Tipo | Constraints | Descripción |
|---|---|---|---|
| `id` | `TEXT (UUID)` | `PK @default(uuid())` | — |
| `name` | `TEXT` | `NOT NULL` | Nombre. |
| `email` | `TEXT` | `NOT NULL @unique` | Email (se guarda en lowercase). |
| `email_verified` | `BOOLEAN` | `NOT NULL DEFAULT false` | Confirmación de email. |
| `phone` | `TEXT` | NULL | Teléfono (opcional, sin uso hoy). |
| `image` | `TEXT` | NULL | Avatar (opcional, sin uso hoy). |
| `role` | `ROLE` | `NOT NULL DEFAULT 'user'` | Enum: `user` / `admin`. |
| `created_at` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |
| `updated_at` | `TIMESTAMPTZ` | `NOT NULL @updatedAt` | Se actualiza automáticamente. |
| `deleted_at` | `TIMESTAMPTZ` | NULL | Soft-delete (el login lo rechaza). |

## Índices

- `UNIQUE(email)` — login lookup + previene duplicados.
- `INDEX(role)`.
- `INDEX(deleted_at)`.

## Relaciones

| Tabla | Tipo | FK / Referencia |
|---|---|---|
| `session` | 1:N | `session.user_id → users.id` (ON DELETE Cascade) |
| `account` | 1:N | `account.user_id → users.id` (ON DELETE Cascade) |
| `user_book` | 1:N | `user_book.userId → users.id` (ON DELETE Cascade) |
| `user_streak` | 1:1 | `user_streak.userId → users.id` |
| `audit_log` | 1:N | `audit_log.userId → users.id` |

## Reglas de negocio

- `register` crea el usuario con `role='user'` y `email_verified=false`.
- `login` rechaza si `deleted_at IS NOT NULL`.
- `admin` está en el enum pero **no se usa** en la app hoy (sin rutas admin ni guards).
- El email se guarda siempre en lowercase.
