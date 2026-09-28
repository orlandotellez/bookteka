# `user_streak`

Racha de lectura diaria. Modelo Prisma `user_streak`. **La tabla se llama `user_streak` (singular)**: el modelo no declara `@@map`.

Relación 1:1 con el usuario (`userId @unique`): cada usuario tiene una sola racha.

## Esquema

| Columna | Tipo | Constraints | Descripción |
|---|---|---|---|
| `id` | `TEXT (UUID)` | `PK @default(uuid())` | — |
| `userId` | `TEXT` | `NOT NULL @unique` | FK → `users.id` (1 racha por usuario). |
| `currentStreak` | `INT` | `NOT NULL DEFAULT 0` | Racha actual (días). |
| `startDate` | `TIMESTAMPTZ` | NULL | Inicio de la racha. |
| `lastActiveDate` | `TIMESTAMPTZ` | NULL | Último día completado. |
| `createdAt` | `TIMESTAMPTZ` | `NOT NULL DEFAULT now()` | — |
| `updatedAt` | `TIMESTAMPTZ` | `NOT NULL @updatedAt` | — |

## Índices

- `UNIQUE(userId)` (implícito por `@unique`).
- `INDEX(userId)`.

## Relaciones

| Tabla | Tipo | FK / Referencia |
|---|---|---|
| `users` | 1:1 | `user_streak.userId → users.id` |

## Reglas de negocio (StreakService.completeDay)

```
Si no existe la racha          → se crea con currentStreak = 1
Si lastActiveDate == hoy       → sin cambios (ya completó hoy)
Si lastActiveDate == ayer      → currentStreak + 1 (continuo)
Si lastActiveDate < ayer       → currentStreak = 1 (reinicia)
```

- La fecha se compara a **medianoche** (local del servidor) o con la `clientDate` enviada por el cliente (evita bugs de timezone).
- `hasCompletedToday = lastActiveDate == hoy` (a medianoche).
- `GET /streak` crea la fila con `currentStreak: 0` si no existe.
