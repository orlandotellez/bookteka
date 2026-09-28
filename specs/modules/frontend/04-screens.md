# Frontend Screens

Inventario completo de pantallas de Bookteka, con su propósito, estado actual y comportamiento.

---

## Convención de nombres

| Convención | Uso |
|---|---|
| Ruta pública | `/auth` (elección de modo), `/auth/login`, `/auth/register` |
| Ruta protegida | `/` (Biblioteca), `/profile` |
| Vista de lector | No es ruta — la renderiza `Layout` cuando `currentView === "reader"` |
| Estado: ✅ implementado | UI viva + flujo end-to-end |
| Estado: ⚠️ parcial | UI existe pero falta algún detalle |

---

## Navegación Local/Servidor en todas las pantallas de auth ✅

**Componente**: `src/components/pages/auth/AuthModeTabs.tsx` (+ module.css)

Las tabs **Local** y **Servidor** aparecen en `/auth`, `/auth/login` y
`/auth/register`: el switcher es el mismo componente y el modo persistido
(`userPreferencesStore.authMode`) es la fuente de verdad.

- Las tabs **solo seleccionan**: nunca navegan por sí mismas.
- Tab **Local** → setea `authMode: "local"` y la pantalla actual muestra el
  `LocalModePanel` (descripción + botón "Entrar sin cuenta"). El botón es el
  que navega a `/`.
- Tab **Servidor** → setea `authMode: "server"` y la pantalla actual muestra
  el formulario correspondiente (login o registro).
- El contenido bajo las tabs es el mismo componente en las tres pantallas:
  `LocalModePanel` cuando el modo es local, `LoginForm`/`RegisterForm` cuando
  es servidor.

## `/auth` — Elección de modo ✅

**Archivo**: `src/pages/auth/AuthMode.tsx` + `AuthMode.module.css`

Mismo layout de Login/Register (SideLogo + lado `--four-color` con borde
izquierdo y `min-height: 420px`), con las tabs arriba y el formulario/pánel a
ancho completo: alternar entre modos ya no desplaza el layout ni achica el
fondo del formulario.

En modo local, `PublicRoute` no redirige para poder volver a la elección; el
`LogoutButton` limpia la base local y vuelve a `/auth` sin llamar al backend.

## `/auth/login` — Login ✅

**Archivos**: `src/pages/auth/Login.tsx` + `src/components/pages/auth/LoginForm.tsx` + `src/components/pages/auth/SideLogo.tsx`

**Propósito**: Inicio de sesión con email/password.

- Form con `react-hook-form` + `zodResolver(loginSchema)` (validación onBlur).
- Campo `email` + `password` (componente `Input` con label + error).
- Submit → `authApi.login(email, password)` → `invalidateAuthSession()` → `navigate("/")`.
- Errores inline (credenciales inválidas).
- Link a `/auth/register`.
- Toggle de tema (IconTheme) + logo según tema.

**Estados**: Empty / Submitting (botón "Cargando...") / Error / Success (redirect).

---

## `/auth/register` — Register ✅

**Archivos**: `src/pages/auth/Register.tsx` + `src/components/pages/auth/RegisterForm.tsx` + `src/components/pages/auth/SideLogo.tsx`

**Propósito**: Crear cuenta nueva.

- Campos: `name`, `email`, `password`, `confirmPassword`.
- `zodResolver(registerSchema)` valida match de passwords.
- Submit → `authApi.register(name, email, password)` → `invalidateAuthSession()` → `navigate("/")`.
- Link a `/auth/login`.

---

## `/` — Biblioteca (Index) ✅

**Archivos**: `src/pages/Index.tsx` + `src/components/pages/index/{FilterBook,CardBook,CardBookList,BookShelfView,Pagination,NoBooks}.tsx` + `src/components/modals/ShowUploaderModal.tsx`

**Propósito**: Pantalla principal con la biblioteca de libros del usuario.

**Features**:

1. **Toolbar** (`FilterBook`): búsqueda por nombre (`normalizeText`) + desplegable de filtro con 3 opciones: `todos | leyendo | sin empezar`. **No hay control de orden** — la lista se ordena por `lastReadAt` en la query del backend y localmente por `position` (orden manual del estante).
2. **Vistas**: `grid` (CardBook), `list` (CardBookList), `shelf` (BookShelfView). La vista shelf muestra todos; grid/list pagan (6 por página).
3. **CardBook**: icono de libro, título (sin `.pdf`), tiempo de lectura + estado ("En progreso"/"Sin empezar"), fecha de última lectura, botón principal ("Continuar leyendo"/"Empezar a leer" → `onOpen`), indicador de sync (`Cloud`/`CloudOff` según `isSynced`), botón eliminar (trash → `DeleteModal`). Cuando el PDF se está preparando, el botón muestra "Descargando n%" con spinner (`isDownloading` + `downloadProgress`).
4. **Paginación**: `Pagination` (6 items/página), resetea a página 1 al cambiar filtros.
5. **Subir libro**: botón "Añadir libro" (header o empty state) → `ShowUploaderModal` → `addBook(name, text, totalPages, file)`.
6. **Abrir libro**: `getBookById(id)` (descarga/extrae PDF si hace falta con progreso) → `setCurrentBook` + `setCurrentView("reader")`.
7. **Empty state**: "Tu biblioteca está vacía" + CTA.

**Flujo de PDF**: si el libro viene del cloud y no tiene texto local, `getBookById` llama `processBookForReading` (stream → pdf.js → extrae texto) con overlay `"Preparando libro... {n}%"`.

---

## `/profile` — Perfil ✅

**Archivos**: `src/pages/Profile.tsx` + `src/components/pages/profile/{ProfileHeader,ProfileTabs,ProfileStats,ProfileBooksTable,ProfileConfig,StreakCard,CardProfile,ReadingSettingsCard,DefaultViewCard,StatCard}.tsx` + `src/components/common/CloudSyncToggle.tsx`

**Propósito**: Estadísticas de lectura, racha, gestión de libros en la nube, preferencias y cierre de sesión.

**Estructura**: `Profile` tiene **dos tabs** (`ProfileTabs` con `ProfileTab = "data" | "config"`). En `data` se ve el perfil y las estadísticas; en `config`, las preferencias.

| Tab | Contenido |
|---|---|
| `data` (default) | `ProfileHeader`, `StreakCard`, `CardProfile`, `ProfileStats`, `ProfileBooksTable` |
| `config` | `ProfileConfig` → `CloudSyncToggle`, `DefaultViewCard`, `ReadingSettingsCard` |

**Secciones de la tab `data`**:

1. **ProfileHeader**: identidad de la pantalla. No es el `Header` global — `Layout` lo oculta en `/profile` (`isNotHeaderPage`), así que esta pantalla trae el suyo.
2. **StreakCard**: racha actual + botón "completar día" (`streakStore.completeDay`) + inicialización (`initializeStreak`). Al montar, `Profile` llama `loadStreakData()`.
3. **CardProfile**: datos del usuario.
4. **ProfileStats** + `StatCard`: 4 tarjetas — Tiempo total, Libros, En progreso, Promedio/libro.
5. **ProfileBooksTable**: tabla de todos los libros, con por fila:
   - badge de sync (`Cloud` si `isSynced`, `CloudOff` si no).
   - `CloudUpload` (subir a la nube) si no está sincronizado; `CloudDownload` (descargar vía URL firmada) si lo está.
   - botón editar tiempo → `EditTimeModal`.
6. **LogoutButton** (`src/components/pages/auth/LogoutButton.tsx`): `clearDatabase()` → `resetDatabase()` → `authApi.logout()` → `invalidateAuthSession()` → `navigate("/auth/login")`. Borra la IndexedDB local antes de cerrar sesión para que el próximo usuario no herede los libros.

**Secciones de la tab `config`**:

7. **CloudSyncToggle**: activa/desactiva la subida a la nube (`userPreferencesStore.cloudSyncEnabled`). Si está apagado, `bookStore.addBook` guarda el libro solo en local.
8. **DefaultViewCard**: vista por defecto de la biblioteca (`shelf` | `grid` | `list`).
9. **ReadingSettingsCard**: preferencias de lectura (fontSize, fontFamily, lineHeight, textWidth) con botón de reset.

**Modals**: `EditTimeModal` (editar `readingTimeSeconds` → `setReadingTime`), disponible desde la tab `data`.

> Nota: `Profile.tsx` no declara el tipo del tab; usa `useState<ProfileTab>("data")` importando `ProfileTab` desde `ProfileTabs.tsx`.

---

## Reader (vista, no ruta) ✅

**Archivos**: `src/components/pages/reader/Reader.tsx` + `TextReader.tsx`, `ReaderHeader.tsx`, `ReadingControls.tsx`, `BooksmarksPanel.tsx`, `HighlightToolbar.tsx`, `PageNavigator.tsx`, `ReadingTimer.tsx`, `StreakButton.tsx`, `StatCard.tsx`

**Propósito**: Lectura del libro con texto extraído del PDF.

**Header**:

- `ReaderHeader`: nombre del archivo, botón cerrar (vuelve a `library`), panel de bookmarks, timer (`ReadingTimer` con `sessionSeconds`), racha (`StreakButton` con `streakData` + `onCompleteDay`/`onInitialize`).
- `ReadingControls`: tipografía (fontSize, fontFamily, lineHeight, textWidth) — se persisten como preferencias por defecto.

**Cuerpo**:

- `TextReader`: renderiza el texto con párrafos, resalta highlights (`HighlightToolbar` para seleccionar texto → agregar highlight con color), navegación por página (`PageNavigator`), scroll persistido, modo zen (oculta header/controls).
- Highlights: 5 colores (`yellow | green | blue | pink | orange`), se guardan solo en IndexedDB.
- Bookmarks: panel lateral con lista, agregar desde toolbar o selección, navegar a página, editar nombre/preview, eliminar. Color aleatorio.

**Timer**: `useReadingTimer` (guarda cada 30s, al pausar, al desmontar y en `beforeunload`). Cada tick → `updateReadingTime` → coalescer de cloud.

**Persistencia en vivo**: `onScrollPositionChange` (debounce del TextReader) → `updateScrollPosition`; `onPageChange` (solo cuando la página real cambia) → `updateCurrentPage`. En `pagehide`/`visibilitychange:hidden` → `flushPendingCloudProgress(bookId, { keepalive: true })`.

---

## `/auth/*` — Auth Layout ✅

- Las páginas de auth no muestran el header (lo detecta `Layout` con `location.pathname.startsWith("/auth")`).
- Sin header global. Logo según tema + formulario + toggle de tema.
- `SideLogo` (`src/components/pages/auth/SideLogo.tsx`) **sí se usa**: lo renderizan tanto `Login.tsx` como `Register.tsx`.

---

## `*` — NotFound ✅

**Archivo**: `src/pages/NotFound.tsx`

Pantalla genérica 404 con link de vuelta.

---

## Patrones comunes

### Header de página

```tsx
<header className={styles.header}>
  <h1>...</h1>
  <button onClick={openAction}><Plus /> Añadir libro</button>
</header>
```

### Card de libro

```tsx
<CardBook book={book} onOpen={handleOpenBook} onDelete={handleDelete} />
```

### Loader de preparación de PDF

```tsx
<Loading text={`Preparando libro... ${pdfProgress}%`} subtext="Extrayendo texto del PDF" />
```
