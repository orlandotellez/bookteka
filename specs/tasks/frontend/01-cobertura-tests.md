# 🟠 Cobertura de tests del frontend

## Estado Actual

El frontend tiene **59 tests en 8 archivos**, concentrados en lo que es fácil de testear en aislamiento:

| Archivo | Tests | Cubre |
|---|---|---|
| `__tests__/store/bookStore.test.ts` | 20 | Estado inicial, `setShowUploader`, `setCurrentView`, `setCurrentBook`, `loadBooks`, `addBook`, `deleteBook`, `updateReadingTime`, `updateScrollPosition`, `getBookById`, `moveBook`. |
| `__tests__/utils/time.test.ts` | 11 | `formatTime`, `formatTimeShort`. |
| `__tests__/components/PDFUploader.test.tsx` | 8 | Uploader de PDF. |
| `__tests__/components/ShowUploaderModal.test.tsx` | 6 | Modal de upload, incluido el camino de error. |
| `__tests__/components/Loading.test.tsx` | 4 | Loading con y sin subtexto. |
| `__tests__/utils/generateId.test.ts` | 4 | Generación de ids y fallback sin `crypto.randomUUID`. |
| `__tests__/utils/text.test.ts` | 4 | `normalizeText`. |
| `__tests__/components/Spinner.test.tsx` | 2 | Spinner. |

### Lo que no tiene un solo test

| Área | Por qué importa | Archivos |
|---|---|---|
| **Vista reader completa** | Es la pantalla donde el usuario pasa el tiempo. `TextReader.tsx` tiene 567 líneas, `Reader.tsx` 322, `BookSharksPanel`/`BooksmarksPanel` 293, `ReadingControls` 227. Ninguna tiene test. | `components/pages/reader/*` |
| **El coalescer de progreso** | Es la lógica más sutil del cliente: Map a nivel de módulo, timer de 3s, flush con `keepalive`. Un cambio acá pierde la posición de lectura del usuario. | `store/bookStore.ts` — `scheduleCloudProgress`, `flushPendingCloudProgress` |
| **`streakStore`** | Tiene tres caminos: cloud, fallback local y "mantener lo que había". La lógica de "nunca sobrescribir con `null`" no está verificada. | `store/streakStore.ts` |
| **`userPreferencesStore`** | Persistencia con `persist`. | `store/userPreferencesStore.ts` |
| **Capa de API** | `api/client.ts` maneja `ApiError`, el parseo del mensaje, la elección entre `crossFetch` y `fetch` nativo, y `keepalive`. Es la frontera con el backend. | `api/*.ts` |
| **Sincronización** | `syncBooksFromCloud` es el merge con `Math.max` por campo. Es la invariante de que el progreso no retrocede, y no está testeada. | `database/sync.ts` |
| **Capas de base de datos** | `connection.ts` (singleton, `clearDatabase`, `resetDatabase`), `features/*.ts` | `database/**` |
| **Rutas y guards** | `ProtectedRoute` decide si redirige a login, `PublicRoute` lo inverso. | `routes/*.tsx` |
| **Bootstrap de la API** | La máquina de estados `loading → ready → manual → retrieving` y el formulario manual. | `context/AppBootstrap.tsx` |
| **Validación de formularios** | Los mensajes de error son la UX del login. | `validations/loginValidations.ts` |
| **Resolución de URL de la API** | `api-config.ts` decide entre dev, bootstrap remoto y fallback. | `lib/api-config.ts` |
| **`apiEnv.ts`** | Elige entre URL relativa y URL LAN según la plataforma. | `lib/apiEnv.ts` |

### Además

- **No hay script `test`** en `frontend/package.json`. Hay que invocar `pnpm exec vitest run` a mano. Quien no sepa el comando no corre los tests.
- **Hay dos archivos de setup.** `src/test/setup.ts` es el que usa `vite.config.ts` (`setupFiles: "./src/test/setup.ts"`). `src/__tests__/setup.ts` tiene el mismo contenido y **no lo referencia nadie**.

## Objetivo

Que las rutas con más riesgo de regresión tengan test: el merge de sincronización, el coalescer de progreso, la capa de API y el reader.

## Alcance

- Agregar el script `test` y borrar el setup duplicado.
- Testear las invariantes, no los detalles de implementación.
- Priorizar por riesgo, no por cobertura percentual.

## Fuera de alcance

- Alcanzar un porcentaje de cobertura arbitrario. Se mide primero.
- Tests end-to-end con navegador (Playwright): son valiosos pero agrega una dependencia grande.
- Testear componentes de presentación triviales.

## Tareas

- [ ] 1. Agregar el script de test y limpiar el setup duplicado
  - En `frontend/package.json`: `"test": "vitest run"` y `"test:watch": "vitest"`.
  - Borrar `frontend/src/__tests__/setup.ts`. El que se usa es `src/test/setup.ts`.
- [ ] 2. Testear el merge de `database/sync.ts`
  - Es la invariante central: el progreso nunca retrocede.
  - Casos: local tiene más tiempo que la nube → gana local; la nube tiene más scroll → gana nube; `text` y `fileBlob` locales sobreviven al merge; `position` local sobrevive; `fileUrl: null` de la nube se convierte en `undefined` (el tipo local lo espera así).
  - Requiere mockear `booksApi.list` y una DB de `fake-indexeddb` (dependencia nueva) o mockear `getDatabase`.
- [ ] 3. Testear el coalescer de `store/bookStore.ts`
  - Con timers falsos de Vitest: dos `scheduleCloudProgress` dentro de la ventana de 3s producen **un** `updateBookProgress` con los campos mezclados.
  - `flushPendingCloudProgress(bookId)` fuerza el envío inmediato y limpia la cola.
  - `flushPendingCloudProgress()` sin argumento flushea todas las colas.
  - `deleteCloudCoalescer(bookId)` elimina la entrada del Map.
  - Un libro con `isSynced: false` no dispara PATCH.
  - Es el archivo de tests más importante de esta tarea.
- [ ] 4. Testear la capa `api/client.ts`
  - `ApiError` extrae el mensaje de `{ error }`, de `{ message }` y de un array con `message` en el primer elemento; si no hay nada, usa `HTTP {status}`.
  - Un error de red (fetch rechaza) produce `ApiError` con `status: 0` y el mensaje "Error al conectar con el servidor".
  - `204` devuelve `undefined` sin intentar parsear.
  - `credentials: "include"` está siempre en la init.
  - Los headers `x-session-token` y `x-refresh-token` se inyectan.
  - Con `FormData`, `raw` o `keepalive`, se usa `globalThis.fetch` en vez de `crossFetch`.
- [ ] 5. Testear `store/streakStore.ts`
  - Cloud responde → usa la respuesta.
  - Cloud falla y hay datos locales → mantiene los locales.
  - Cloud falla y no hay datos → no deja el estado en `null` si ya había algo.
  - `completeDay` devuelve `false` si el día ya estaba completado.
  - La clave de `persist` es `bookteka-streak` y `partialize` solo guarda `streakData`.
- [ ] 6. Testear los guards de rutas
  - `ProtectedRoute` con sesión → children. Sin sesión → `Navigate` a `/auth/login`. Con error → `/auth/login`. Con `isPending` → `Loading`.
  - `PublicRoute` con sesión → `Navigate` a `/`.
  - Estos necesitan `MemoryRouter` de `react-router-dom` y mockear `useAuthSession`.
- [ ] 7. Testear el reader
  - Priorizar `TextReader.tsx` sobre el resto: verificar que renderiza los párrafos y que encuentra los marcadores `[PAGE_n]`.
  - Este test va junto con el de `specs/tasks/frontend/02-trabajo-pdf.md` tarea 6: es el contrato entre el extractor y el reader.
  - Después: `PageNavigator` (navegación) y `ReadingControls` (cambio de tipografía).
- [ ] 8. Testear `validations/loginValidations.ts`
  - Detectar aquí un problema real: el schema exige `min(6)` de password, pero el backend (`src/schema/auth.schema.ts` — `LoginSchema`) exige `min(8)`. Un usuario con una contraseña válida de 6 caracteres no puede registrarse, y el frontend deja intentarlo. Ver `specs/tasks/frontend/04-validaciones.md`.
- [ ] 9. Medir la cobertura y anotarla
  - Vitest ya está configurado; falta activarle el reporter de cobertura.
  - Anotar el número real en `specs/modules/frontend/05-quality.md`. Hoy ese archivo dice 59 tests y nada más.

## Criterios de Done

- [ ] `pnpm test` existe y corre la suite.
- [ ] El merge de sincronización tiene tests que fallan si alguien saca un `Math.max`.
- [ ] El coalescer de progreso tiene tests con timers falsos que verifican el agrupamiento.
- [ ] `api/client.ts` tiene tests del parseo de errores y de la elección de transporte.
- [ ] `TextReader` y el extractor comparten un test de contrato.
- [ ] `src/__tests__/setup.ts` no existe.
- [ ] La cobertura está medida y el número está en los specs.
