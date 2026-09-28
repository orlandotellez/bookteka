# 06 — Estrategia de Estado

El estado de Bookteka está repartido en tres capas con una regla clara de precedencia. Este documento explica qué vive dónde y por qué.

---

## Dominio del estado

| Dominio | Dónde vive | Por qué ahí |
|---|---|---|
| Libros, progreso, marcadores, resaltados | **IndexedDB** (`src/database/`) | Son datos voluminosos (texto extraído del PDF, blobs) y tienen que sobrevivir al cierre de la app y funcionar sin red. |
| Sesión y tokens | **localStorage** (`src/lib/sessionToken.ts`) | Se leen de forma sincrónica antes de cada request; no pueden esperar a una promesa. |
| Racha y preferencias | **localStorage** (middleware `persist` de Zustand) | Son valores chicos y se necesitan en el primer render para no parpadear. |
| Estado de UI en vivo (vista actual, libro abierto, modales, flags de progreso) | **Zustand en memoria** (`src/store/bookStore.ts`) | Es volátil: si se pierde, la siguiente lectura lo reconstruye desde IndexedDB. |

---

## Solución

### Zustand para el estado de sesión de la app

Tres stores, sin slices ni middleware de Redux:

| Store | Estado | Persistencia |
|---|---|---|
| `useBookStore` | `books`, `currentView`, `currentBook`, flags de carga/subida, acciones CRUD y de cloud | Ninguna (lee/escribe IndexedDB) |
| `useStreakStore` | `streakData`, `isStreakLoading` | `persist` → `bookteka-streak` |
| `useUserPreferences` | `cloudSyncEnabled`, `defaultReadingSettings`, `defaultView` | `persist` → `bookteka-user-preferences` |

`useBookStore` es el store principal y el único con estado complejo. Los otros dos son envolturas finas sobre un endpoint + caché local.

### IndexedDB como caché, no como fuente de verdad

`src/database/` expone una API por dominio (`features/books.ts`, `bookmarks.ts`, `highlights.ts`, `streaks.ts`, `user.ts`) re-exportada por `database/index.ts`. Los stores y hooks consumen **solo** esa API: nunca llaman `db.get()` directo.

`syncBooksFromCloud()` (`src/database/sync.ts`) es el merge:

```ts
// Para cada libro del cloud:
readingTimeSeconds: Math.max(local, cloud)
scrollPosition:     Math.max(local, cloud)
currentPage:        Math.max(local, cloud)
lastReadAt:         Math.max(local, cloud) || Date.now()
text:               localBook?.text || ""   // el cloud nunca manda el texto
fileBlob:           localBook?.fileBlob    // el blob es local, no viaja
position:           localBook?.position    // el orden manual es local
```

El "mayor de los dos" es la invariante: **el progreso nunca retrocede**, sin importar de qué dispositivo venga el request.

---

## Reglas de actualización

1. **El cloud es la fuente de verdad cuando hay sesión.** `loadStreakData`, `completeDay` y `initializeStreak` pegan al backend primero; IndexedDB es el fallback si la red falla (`src/store/streakStore.ts`).
2. **Nunca sobrescribir el estado con `null`.** Si el sync falla, se mantiene lo que ya había en memoria.
3. **Progreso: agendado, no inmediato.** Cada cambio llama a `scheduleCloudProgress(bookId, patch)`, que acumula campos por libro durante 3s y envía **un** `PATCH /progress` con todo lo pendiente.
4. **El agendado va antes del `await` local.** En `updateReadingTime`, `setReadingTime`, `updateScrollPosition` y `updateCurrentPage`, el `scheduleCloudProgress` se ejecuta de forma sincrónica *antes* del `await` a IndexedDB. Si `flushPendingCloudProgress` corre por `pagehide` mientras la función sigue viva, el valor nuevo ya está en la cola.
5. **Flush forzado en cierre.** `flushPendingCloudProgress(bookId, { keepalive: true })` se llama en `pagehide` y `visibilitychange:hidden`. `keepalive` deja que la request sobreviva al unload.
6. **Fallo de cloud nunca rompe la operación local.** En `addBookmark` y `removeBookmark`, si la API falla, el marcador se conserva en IndexedDB y se loguea el error.
7. **Nunca mutar el estado de Zustand.** Siempre `set(...)`; para leer fuera de React, `useBookStore.getState()`.

### El coalescer de progreso

```
scroll ─┐
timer  ─┼─→ pending[bookId] = { scroll, time, page, lastReadAt }
page   ─┘         │
                  └─(3s)→ un solo PATCH /books/:id/progress
```

`cloudCoalescers` es un `Map<bookId, { pending, timer }>` a nivel de módulo. `deleteCloudCoalescer(bookId)` existe para que el Map no crezca sin límite en sesiones largas: se llama desde `deleteBook`.

---

## Persistencia

### Qué se borra y cuándo

| Evento | Qué pasa |
|---|---|
| Login | `setCurrentUserId(user.id)` — todas las queries de IndexedDB se filtran por ese id. |
| Logout (`LogoutButton`) | `clearDatabase()` borra la DB entera y después `resetDatabase()` la reabre vacía, antes de `authApi.logout()`. |
| Cambio de usuario | No hay logout automático: si el usuario cierra sesión sin pasar por el botón, la DB local queda con datos del usuario anterior. Ver `specs/tasks/frontend/03-codigo-muerto.md`. |

### Multi-usuario en el mismo dispositivo

Los stores de IndexedDB tienen índice `by-userId` y filtran en lectura (`getAllBooks`, `getBookmarksByBook`), pero **no hay borrado por usuario**: `clearDatabase()` borra todo. El modelo asume un usuario por dispositivo.

### Sesión en cache

`src/lib/sessionCache.ts` cachea la sesión 5 minutos en memoria y refresca en background cuando la cache vence, con un `MIN_RETRY_MS` de 30s para no martillar al backend cuando está caído.

---

## Puntos de fricción conocidos

| Tema | Dónde | Problema |
|---|---|---|
| Doble implementación del estado de libros | `src/hooks/useBooks.tsx` vs `src/store/bookStore.ts` | `useBooks` no lo importa nadie. Dos APIs para lo mismo. |
| ~~Dos capas de extracción de PDF~~ **✅ resuelto** | Un solo módulo `lib/pdf.ts`, formato único. Ver `02-trabajo-pdf.md`. |
| Estado de tema duplicado | `src/context/ThemeContext.tsx` | Solo maneja `light`/`dark`, pero `index.css` define 6 temas. |
| Borrado de DB en logout | `LogoutButton.tsx` | Hay un `try { } catch { }` vacío de sincronización, resultado de un refactor a medias. |

Todos con plan de arreglo en `specs/tasks/frontend/`.
