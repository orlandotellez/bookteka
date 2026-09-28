# Frontend Architecture

Estructura y patrones del código React de Bookteka.

---

## Filosofía

1. **Pages son smart**: cada page maneja su estado y llama al store/API.
2. **API layer hace 1 cosa**: HTTP tipado (`src/api/<feature>.ts`). No maneja UI ni estado.
3. **Store (Zustand) para lo compartido**: biblioteca, progreso, rachas, preferencias.
4. **IndexedDB como caché offline**: el cloud es la fuente de verdad con sesión; lo local permite leer sin red.
5. **Errores siempre visibles**: toast (`sonner`) + inline en forms.

---

## Bootstrapping

### `main.tsx`

```tsx
<StrictMode>
  <AppBootstrap>
    <BrowserRouter>
      <ThemeProvider>
        <AppRoutes />
      </ThemeProvider>
    </BrowserRouter>
  </AppBootstrap>
</StrictMode>
```

- `patchFetchWithSessionToken()` se ejecuta antes del render (inyecta `x-session-token`/`x-refresh-token` en los fetch nativos a la API).
- `AppBootstrap` (lo más externo): resuelve la URL de la API con `fetchAndStoreApiUrl()`. Máquina de estados `loading → ready | manual | retrieving`. Muestra `SplashScreen` mientras carga y un formulario manual si no hay conexión con el bootstrap.
- `ThemeProvider` aplica el tema (lazy init síncrono desde localStorage).
- `AppRoutes` monta las rutas.

### `index.html`

- Script inline en `<head>`: lee `localStorage["theme"]`, setea `data-theme` en `<html>` y `--splash-bg`/`--splash-fg` con los colores del tema (6 temas mapeados).
- Splash estático (`#splash-root` con spinner) dentro de `#root` → se ve desde el primer paint hasta que React monta el `SplashScreen` de AppBootstrap (visualmente idéntico).

---

## Routing

```tsx
// src/routes/AppRoutes.tsx
<Routes>
  <Route element={<App />}>   {/* App = ThemeWrapper + Layout + Outlet + Toaster */}
    <Route path="/auth/login"    element={<PublicRoute><Login /></PublicRoute>} />
    <Route path="/auth/register" element={<PublicRoute><Register /></PublicRoute>} />
    <Route path="/"              element={<ProtectedRoute><Index /></ProtectedRoute>} />
    <Route path="/profile"       element={<ProtectedRoute><Profile /></ProtectedRoute>} />
    <Route path="*"              element={<NotFound />} />
  </Route>
</Routes>
```

- `PublicRoute`: si hay sesión → redirect a `/`. Sino, renderiza children.
- `ProtectedRoute`: valida sesión (con `useAuthSession`), carga libros al primer acceso (`loadBooks()` + `syncBooks()`), redirige a `/auth/login` si no hay sesión.
- La **vista de lector no es una ruta**: `Layout` renderiza `<Reader />` cuando `currentView === "reader"` (estado del `bookStore`).

---

## State management

### Zustand (`src/store/`)

| Store | Persistencia | Contenido |
|---|---|---|
| `bookStore` | IndexedDB (via database layer) | libros, progreso, bookmarks, highlights, vistas, upload/cloud. **Store principal.** |
| `streakStore` | localStorage `bookteka-streak` + IndexedDB | racha actual, completeDay, initializeStreak, sync cloud. |
| `userPreferencesStore` | localStorage `bookteka-user-preferences` | `cloudSyncEnabled`, `defaultReadingSettings`. |

### `bookStore` (detalles clave)

- Estado: `books`, `isLoading`, `error`, `showUploader`, `currentView` (`library | reader | profile`), `currentBook`, `isSyncing`, `isProcessingPdf`, `pdfProgress`, `downloadingBookId`, `uploadingBookId`.
- Acciones CRUD: `addBook`, `deleteBook`, `getBookById`, `loadBooks`, `syncBooks`.
- Acciones de lectura: `updateReadingTime`, `setReadingTime`, `updateScrollPosition`, `updateCurrentPage`.
- Bookmarks/highlights: `loadBookmarks`, `addBookmark`, `updateBookmark`, `removeBookmark`, `loadHighlights`, `addHighlight`, `removeHighlight`.
- Cloud manual: `uploadBookToCloud`, `downloadBookFromCloud`.
- **Coalescer de progreso**: los `PATCH /progress` se acumulan 3s por libro (`scheduleCloudProgress`) y se envían en 1 solo request. `flushPendingCloudProgress(bookId, { keepalive })` fuerza el envío en `pagehide`/`visibilitychange`/unmount.
- `addBook`: sube a la nube solo si `cloudSyncEnabled && file`. Si falla, guarda local con `isSynced: false`.
- `deleteBook`: borra del cloud solo si `isSynced`, descarta PATCH pendientes (`deleteCloudCoalescer`), borra de IndexedDB.

### `streakStore`

- `loadStreakData`: sync con cloud primero; si falla, usa datos locales de IndexedDB; si no hay nada, mantiene el estado.
- `completeDay`: cloud primero (fuente de verdad), fallback local con lógica de días consecutivos.
- `initializeStreak`: cloud primero (backend calcula los días), fallback local calculando días desde `startDate`.

---

## Capa de datos local (IndexedDB)

`src/database/` (idb):

```
database/
├── schema.ts        # ReaderDBSchema + DB_NAME "bookteka-db" + DB_VERSION 4
├── connection.ts    # getDatabase (singleton), setCurrentUserId, clearDatabase
├── sync.ts          # syncBooksFromCloud (merge de progreso local vs cloud)
└── features/
    ├── books.ts     # getAllBooks, getBook, saveBook, deleteBook, updateReadingTime, scroll, page
    ├── bookmarks.ts # getBookmarksByBook (migra scrollPosition→pageNumber), save/update/delete
    ├── highlights.ts# getHighlightsByBook, saveHighlight, deleteHighlight
    ├── streaks.ts   # getStreakData, saveStreakData, syncStreakFromCloud, completeDayInCloud, initializeStreakInCloud
    └── user.ts      # getUserProfile, getOrCreateUserProfile, updateUserReadingTime, getTotalReadingTime
```

Stores de IndexedDB: `books` (idx `by-lastRead`, `by-userId`), `bookmarks` (idx `by-bookId`, `by-userId`), `highlights` (idx `by-bookId`, `by-userId`), `userProfile`, `streaks`.

> `syncBooksFromCloud` hace **merge**: toma el mayor entre `readingTimeSeconds`/`scrollPosition`/`currentPage`/`lastReadAt` local vs cloud, preserva `text` y `fileBlob` locales.

---

### Capa PDF — dos caminos distintos

Hay **dos** módulos de extracción y cada uno cubre un caso:

| Módulo | Entrada | Worker | Quién lo usa |
|---|---|---|---|
(actualizado: ver sección "Capa PDF — un solo camino (lib/pdf.ts)" más abajo)



`processBookForReading` es un no-op si el libro ya tiene texto (`book.text.length > 10`): no vuelve a descargar el PDF.

---

## Capa de API

### `src/api/client.ts` (unificado)

```ts
export class ApiError extends Error {
  status: number;
  data: unknown;
  // message extraído de { error | message | array Zod }
}

export const api = {
  get / post / put / patch / delete / raw
};
```

- URL base desde `readApiUrl()` (api-config).
- Headers de sesión: `x-session-token` + `x-refresh-token` (desde `sessionToken.ts`).
- `credentials: "include"` (cookies web).
- En Tauri usa `crossFetch` (invoke `http_request` a Rust); FormData, `raw` y `keepalive` van por fetch nativo (el bridge Rust no soporta multipart/binarios).
- `api.raw(path)` devuelve la `Response` nativa (streams de PDF).

### Módulos

| Archivo | Exports |
|---|---|
| `api/auth.ts` | `authApi` (login/register/getSession/refresh/logout con refresh-on-401) + `AuthApiError`, tipos `AuthUser`, `SessionData`, `AuthResponse`. |
| `api/book.ts` | `booksApi` (list/upload/download/stream/updateProgress/remove) + compat `uploadBook`, `downloadBook`, `deleteBookInCloud`, `updateBookProgress`. |
| `api/bookmark.ts` | `bookmarksApi` (list/create/remove/update) + compat. |
| `api/streak.ts` | `streakApi` (get/complete/initialize). |
| `api/index.ts` | barrel exports. |
| `lib/auth-api.ts` | re-export de `api/auth` (compat para `sessionCache`, forms). |

---

## Modo local sin backend

`userPreferencesStore.authMode` (`"local" | "server"`, persistido) cambia el
comportamiento en tres puntos sin tocar la capa de datos:

1. `lib/sessionCache.ts`: en modo local, `getCachedSession` devuelve una sesión
   sintética (`local-user`) sin llamar a la red. Toda la app que consulta
   sesión (guards, stores) la ve como usuario válido.
2. `store/bookStore.ts`: `loadBooks`/`syncBooks` no sincronizan y `addBook` no
   sube archivos en modo local. Los datos viven solo en IndexedDB bajo el
   userId sintético `local-user`.
3. `LogoutButton` y `PublicRoute`: en modo local no hay llamadas al backend y
   `/auth` sigue accesible para poder cambiar de modo.

## Flujo de sesión

1. `authApi.login/register` → `api.post` → `setSessionTokens(access, refresh)` (localStorage).
2. `getCachedSession()` (`sessionCache.ts`) → TTL 5 min → `authApi.getSession()` → si 401 y hay refresh → `authApi.refresh()` → reintenta.
3. `useAuthSession()` expone `{ data, isPending, error }` para `ProtectedRoute`/`PublicRoute`.
4. `LogoutButton` → `authApi.logout()` → limpia tokens + `clearDatabase()` (IndexedDB).

---

## Errores

- `ApiError` con `status` + `message` (extraído de `{ error | message }`).
- Pages/stores capturan con try/catch → `toast.error(error.message)` o `set({ error })`.
- `patchFetchWithSessionToken()` monkey-patchea `window.fetch` para inyectar los tokens, pero **solo en URLs que empiezan por `API_BASE` o `/api`**. Las URLs firmadas de R2 quedan fuera del patch: viajan con `credentials: "include"` y sin `x-session-token`.

---

## Convenciones

| Concepto | Convención |
|---|---|
| Component file | `PascalCase.tsx`. |
| Page file | `PascalCase.tsx` en `pages/`. |
| Hook custom | `use<Thing>.ts(x)`. |
| Store | `camelCase` + sufijo `Store` (`useBookStore`). |
| CSS module | `PascalCase.module.css`. |
| Tipo | `interface` (preferido) o `type` para unions. |
| Import de API | siempre `@/api/...`, nunca fetch directo en pages. |

> **`hooks/useBooks.tsx` está muerto.** Ningún archivo lo importa: el estado de la biblioteca vive exclusivamente en `useBookStore`. Es una segunda implementación del mismo dominio que va a divergir. Ver `specs/tasks/frontend/03-codigo-muerto.md`.
