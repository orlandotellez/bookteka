# 1. Flujo de lectura (abrir y progresar un libro)

**Descripción**: El usuario abre un libro desde su biblioteca, el cliente descarga/extrae el texto del PDF si hace falta, y el progreso (página, scroll, tiempo) se persiste localmente y se sincroniza con la nube.

**Actores**: Usuario, Frontend (React/Tauri), Backend (Express), R2, IndexedDB

**Tablas involucradas**: `user_book`, `book`, `bookmark`, `session` (auth)

**Endpoints**: `GET /book`, `GET /book/:id/stream`, `PATCH /book/:id/progress`

## Diagrama (apertura)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant F as Frontend (Library)
    participant S as bookStore (Zustand)
    participant DB as IndexedDB
    participant B as Backend (Express)
    participant R2 as Cloudflare R2

    U->>F: Click en un libro
    F->>S: getBookById(book.id)
    S->>DB: getBook(id)
    alt libro sin texto local (viene del cloud)
        S->>B: GET /book/:id/stream
        B->>R2: GetObject (fileKey)
        R2-->>B: PDF stream
        B-->>S: application/pdf
        S->>S: pdf.js extrae texto ([PAGE_n]...)
        S->>DB: saveBook(con texto extraído)
    end
    S-->>F: currentBook + setCurrentView("reader")
    F->>U: Reader con TextReader
```

## Diagrama (progreso)

```mermaid
sequenceDiagram
    participant U as Usuario
    participant R as Reader
    participant S as bookStore
    participant DB as IndexedDB
    participant C as Coalescer (3s)
    participant B as Backend

    loop Mientras lee
        U->>R: Scroll / avanza página / pasa el tiempo
        R->>S: updateScrollPosition / updateCurrentPage / updateReadingTime
        S->>DB: updateBook* (local, instantáneo)
        S->>C: scheduleCloudProgress(bookId, patch)
    end

    Note over C: 3s sin nuevos cambios
    C->>B: PATCH /book/:id/progress (un solo request con todos los campos)
    B->>B: update user_book
    B-->>C: 200 { success, ... }

    Note over S,B: En pagehide/visibilitychange:hidden
    S->>B: flushPendingCloudProgress(bookId, { keepalive: true })
```

## Reglas clave

1. El **progreso local es instantáneo** (IndexedDB); el cloud se actualiza con coalescing (máx 1 PATCH cada 3s).
2. El **merge** (`syncBooksFromCloud`) conserva el mayor entre local y cloud (`readingTimeSeconds`, `scrollPosition`, `currentPage`, `lastReadAt`).
3. El **stream** es la única forma de obtener el PDF (protege R2 y evita CORS).
4. Los **bookmark** se guardan con la página actual del reader; el color es solo local.

## Errores a manejar

- Stream falla (red/R2) → el libro queda con texto vacío y se reintenta al volver a abrir.
- PATCH falla (offline) → el coalescer loguea el error; el próximo flush reintenta. El progreso local nunca se pierde.
- `pagehide` con `keepalive` garantiza que la posición final llegue aunque se cierre la app.

## Tests sugeridos

- Apertura de libro con texto local vs sin texto (descarga del stream).
- Merge: local > cloud y cloud > local.
- Coalescer: N updates en 3s → 1 PATCH.
