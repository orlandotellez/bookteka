# Database Module

Esquema y configuración de la base de datos PostgreSQL de Bookteka.

## Estructura

```text
db/
├── README.md                          # Este archivo
├── setup.md                           # Setup local (Docker, Prisma, .env)
│
├── enums/
│   ├── README.md                      # Índice de enums
│   └── 01-role.md
│
├── schemas/
│   ├── README.md                      # Índice de tablas
│   ├── index.md                       # Modelo completo + relaciones + convenciones
│   ├── 01-users.md
│   ├── 02-sessions.md
│   ├── 03-accounts.md
│   ├── 04-verifications.md
│   ├── 05-books.md
│   ├── 06-user-books.md
│   ├── 07-bookmarks.md
│   ├── 08-user-streaks.md
│   └── 09-audit-logs.md
│
└── use-cases/
    ├── README.md
    ├── 01-flujo-de-lectura.md
    └── 02-sistema-de-rachas.md
```

## Stack

| Componente | Tecnología |
|---|---|
| Motor | PostgreSQL 16 |
| ORM | Prisma 6 (`backend-express/prisma/schema.prisma`) |
| Migraciones | Prisma Migrate (`prisma/migrations/`) |
| Cliente | `@prisma/client` (singleton `dbPrisma`) |
| Storage de archivos | Cloudflare R2 (fuera de la DB, solo se guardan `fileUrl`/`fileKey`) |
| Soft delete | solo `users.deleted_at` |
| Dedup de libros | `book.fileHash @unique` (SHA-256) |

## Modelos (9 + 1 enum)

| Modelo | Tabla | Descripción |
|---|---|---|
| `user` | `users` | Usuarios + soft-delete + rol. |
| `session` | `session` | Refresh tokens activos (rotación). |
| `account` | `account` | Cuentas de credenciales (password bcrypt). |
| `verification` | `verification` | Códigos de verificación de email. |
| `book` | `book` | Libro físico (PDF en R2), dedup por hash. |
| `user_book` | `user_book` | Relación usuario-libro + progreso de lectura. |
| `bookmark` | `bookmark` | Marcadores por página. |
| `user_streak` | `user_streak` | Racha de lectura (1 por usuario). |
| `audit_log` | `audit_log` | Auditoría de acciones (borrados). |
| enum `ROLE` | — | `user`, `admin` (default `user`). |
