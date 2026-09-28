# 04 · Streak — Rachas de lectura

> ✅ **Implementado en Express** (`backend-express/src/modules/streak/presentation/streak.routes.ts`).

Racha diaria de lectura: 1 fila `user_streak` por usuario. La racha **se incrementa** si el usuario completa un día consecutivo y **se reinicia a 1** si saltó un día.

**Auth**: todos los endpoints requieren sesión (`requireAuth`).

## Tabla de endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/streak` | Obtiene la racha del usuario (la crea si no existe). |
| POST | `/streak/complete` | Marca el día de hoy completado. |
| POST | `/streak/initialize` | Inicializa la racha con una fecha de inicio. |

---

## GET `/api/v1/streak`

- **Auth**: Sí.

### Response 200

```json
{
  "currentStreak": 5,
  "startDate": "2026-06-04",
  "lastActiveDate": "2026-06-08",
  "hasCompletedToday": true
}
```

### Notas

- `startDate`/`lastActiveDate` en formato `YYYY-MM-DD` (`helper/time.ts: toDateString`).
- Si no existe `user_streak`, la crea con `currentStreak: 0`.
- `hasCompletedToday` compara `lastActiveDate` (a medianoche local) con hoy.

---

## POST `/api/v1/streak/complete`

- **Auth**: Sí.
- Body opcional (`CompleteDayBodySchema` usa `.default({})`).

### Request body (opcional)

```json
{
  "clientDate": "2026-06-08",
  "clientTimestamp": 1710000000000
}
```

> `clientDate` permite al cliente indicar su fecha local (evita problemas de timezone: un usuario en UTC-3 a las 11 PM no debe contarse como el día siguiente en UTC).

### Response 200

```json
{
  "currentStreak": 6,
  "startDate": "2026-06-04",
  "lastActiveDate": "2026-06-08",
  "hasCompletedToday": true,
  "isNew": false
}
```

### Lógica

```
Estado: currentStreak = 5, lastActiveDate = 2026-06-04

Hoy 2026-06-05  → día consecutivo → currentStreak = 6 ✅
Hoy 2026-06-06  → saltó un día    → currentStreak = 1 (reinicia) 🔄
Hoy 2026-06-04  → ya completó hoy → sin cambios (currentStreak = 5)
```

### Errores

- `400` — `clientDate`/`clientTimestamp` inválidos (regex `YYYY-MM-DD`, refine de fecha).

---

## POST `/api/v1/streak/initialize`

- **Auth**: Sí.

### Request body

```json
{ "startDate": "2026-06-01" }
```

### Response 200

```json
{
  "currentStreak": 1,
  "startDate": "2026-06-01",
  "lastActiveDate": "2026-06-01",
  "hasCompletedToday": true
}
```

### Validaciones (InitializeStreakBodySchema)

- `startDate`: requerido, regex `YYYY-MM-DD`.

---

## Cliente (frontend)

- `streakApi` (`src/api/streak.ts`): `get`, `complete`, `initialize`.
- `streakStore`: `loadStreakData` (cloud primero, IndexedDB como fallback), `completeDay` (cloud primero, lógica local como fallback), `initializeStreak` (cloud primero; el backend calcula los días).
- El `StreakButton`/`StreakCard` muestran la racha y el botón de completar día.
