# 2. Sistema de rachas (complete day)

**Descripción**: El usuario completa el día de lectura. El backend calcula la racha (continuación o reinicio) usando la fecha del cliente para evitar problemas de timezone.

**Actores**: Usuario, Frontend (StreakButton/StreakCard), Backend (Express)

**Tablas involucradas**: `user_streak`

**Endpoints**: `GET /streak`, `POST /streak/complete`, `POST /streak/initialize`

## Diagrama

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as Frontend (Reader/Perfil)
    participant S as streakStore
    participant B as Backend (Express)
    participant DB as PostgreSQL

    U->>F: Click "completar día"
    F->>S: completeDay()
    S->>B: POST /streak/complete
    B->>DB: SELECT user_streak WHERE userId
    alt no existe
        B->>DB: INSERT (currentStreak=1, lastActiveDate=hoy)
        B-->>S: { currentStreak: 1, hasCompletedToday: true, isNew: true }
    else lastActiveDate == hoy
        B-->>S: { currentStreak: actual, hasCompletedToday: true }
    else lastActiveDate == ayer
        B->>DB: UPDATE currentStreak = +1
        B-->>S: { currentStreak: n+1, isNew: false }
    else lastActiveDate < ayer (saltó días)
        B->>DB: UPDATE currentStreak = 1 (reinicio)
        B-->>S: { currentStreak: 1, isNew: true }
    end
    S->>S: Guarda en IndexedDB (caché)
    S-->>F: streakData actualizado
```

## Diagrama (carga inicial)

```mermaid
sequenceDiagram
    participant F as Frontend
    participant S as streakStore
    participant B as Backend
    participant IDB as IndexedDB

    F->>S: loadStreakData()
    S->>B: GET /streak
    alt cloud OK
        B-->>S: streakData
        S->>IDB: saveStreakData (caché)
    else cloud falla
        S->>IDB: getStreakData()
        IDB-->>S: streakData (si existe)
        Note over S: Nunca se sobreescribe el estado con null
    end
```

## Reglas clave

1. **La nube es la fuente de verdad**; IndexedDB es caché para offline.
2. `completeDay` acepta `clientDate` (YYYY-MM-DD) para que la racha cuente el día del cliente y no el UTC del servidor.
3. El reinicio a 1 es intencional (leer con días de por medio rompe la racha).
4. `hasCompletedToday` evita doble conteo en el mismo día.

## Errores a manejar

- Sin conexión: fallback local con la misma lógica (comparar fechas a medianoche).
- Doble click: el segundo `complete` devuelve `hasCompletedToday: true` sin incrementar.

## Tests sugeridos

- Día consecutivo → +1.
- Salto de día → reinicio a 1.
- Mismo día → sin cambios.
- Timezone: `clientDate` del cliente gana sobre la fecha del servidor.
